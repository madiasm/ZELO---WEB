import os

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request

app = Flask(__name__)

TIPOS = ["DAS", "Alvará", "Declaração", "Outros"]
STATUS = ["PENDENTE", "CONCLUIDA"]

COLUNAS = (
    "id, titulo, descricao, tipo, "
    "to_char(data_vencimento, 'YYYY-MM-DD') AS data_vencimento, "
    "status, valor::float AS valor"
)


def conectar():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def executar(sql, params=(), um=False):
    conexao = conectar()
    try:
        with conexao, conexao.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params)
            if cursor.description is None:
                return None
            return cursor.fetchone() if um else cursor.fetchall()
    finally:
        conexao.close()


def validar(dados):
    if not dados:
        return "Envie os dados em formato JSON."
    if not str(dados.get("titulo", "")).strip():
        return "O título é obrigatório."
    if not dados.get("data_vencimento"):
        return "A data de vencimento é obrigatória."
    if dados.get("tipo", "DAS") not in TIPOS:
        return "Tipo inválido."
    if dados.get("status", "PENDENTE") not in STATUS:
        return "Status inválido."
    valor = dados.get("valor")
    if valor not in (None, ""):
        try:
            if float(valor) < 0:
                return "O valor não pode ser negativo."
        except (TypeError, ValueError):
            return "Valor inválido."
    return None


def extrair(dados):
    valor = dados.get("valor")
    return (
        dados["titulo"].strip(),
        dados.get("descricao", "").strip(),
        dados.get("tipo", "DAS"),
        dados["data_vencimento"],
        dados.get("status", "PENDENTE"),
        None if valor in (None, "") else float(valor),
    )


@app.get("/saude")
def saude():
    return jsonify({"status": "ok"})


@app.get("/obrigacoes")
def listar():
    linhas = executar(f"SELECT {COLUNAS} FROM obrigacao ORDER BY data_vencimento, id")
    return jsonify(linhas)


@app.get("/obrigacoes/<int:id_obrigacao>")
def buscar(id_obrigacao):
    linha = executar(
        f"SELECT {COLUNAS} FROM obrigacao WHERE id = %s", (id_obrigacao,), um=True
    )
    if linha is None:
        return jsonify({"erro": "Obrigação não encontrada."}), 404
    return jsonify(linha)


@app.post("/obrigacoes")
def criar():
    dados = request.get_json(silent=True)
    erro = validar(dados)
    if erro:
        return jsonify({"erro": erro}), 400
    linha = executar(
        "INSERT INTO obrigacao (titulo, descricao, tipo, data_vencimento, status, valor) "
        f"VALUES (%s, %s, %s, %s, %s, %s) RETURNING {COLUNAS}",
        extrair(dados),
        um=True,
    )
    return jsonify(linha), 201


@app.put("/obrigacoes/<int:id_obrigacao>")
def atualizar(id_obrigacao):
    dados = request.get_json(silent=True)
    erro = validar(dados)
    if erro:
        return jsonify({"erro": erro}), 400
    linha = executar(
        "UPDATE obrigacao SET titulo = %s, descricao = %s, tipo = %s, "
        "data_vencimento = %s, status = %s, valor = %s "
        f"WHERE id = %s RETURNING {COLUNAS}",
        extrair(dados) + (id_obrigacao,),
        um=True,
    )
    if linha is None:
        return jsonify({"erro": "Obrigação não encontrada."}), 404
    return jsonify(linha)


@app.delete("/obrigacoes/<int:id_obrigacao>")
def excluir(id_obrigacao):
    linha = executar(
        "DELETE FROM obrigacao WHERE id = %s RETURNING id", (id_obrigacao,), um=True
    )
    if linha is None:
        return jsonify({"erro": "Obrigação não encontrada."}), 404
    return "", 204


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
