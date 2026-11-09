const API = "/api/obrigacoes";

const formulario = document.getElementById("formulario");
const lista = document.getElementById("lista");
const mensagem = document.getElementById("mensagem");
const botaoCancelar = document.getElementById("cancelar");
const tituloForm = document.getElementById("titulo-form");

const campos = {
    id: document.getElementById("id"),
    titulo: document.getElementById("titulo"),
    descricao: document.getElementById("descricao"),
    tipo: document.getElementById("tipo"),
    data: document.getElementById("data"),
    valor: document.getElementById("valor"),
};

let obrigacoes = [];

function hoje() {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function formatarValor(valor) {
    if (valor === null) {
        return "Sem valor";
    }
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function estaAtrasada(item) {
    return item.status === "PENDENTE" && item.data_vencimento < hoje();
}

function mostrarErro(texto) {
    mensagem.textContent = texto;
}

async function carregar() {
    try {
        const resposta = await fetch(API);
        obrigacoes = await resposta.json();
        desenharLista();
        atualizarResumo();
    } catch (erro) {
        lista.innerHTML = '<div class="vazio">Não foi possível carregar as obrigações.</div>';
    }
}

function atualizarResumo() {
    const concluidas = obrigacoes.filter((o) => o.status === "CONCLUIDA").length;
    const atrasadas = obrigacoes.filter(estaAtrasada).length;
    document.getElementById("total").textContent = obrigacoes.length;
    document.getElementById("concluidas").textContent = concluidas;
    document.getElementById("atrasadas").textContent = atrasadas;
    document.getElementById("pendentes").textContent = obrigacoes.length - concluidas;
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) {
        elemento.className = classe;
    }
    if (texto !== undefined) {
        elemento.textContent = texto;
    }
    return elemento;
}

function criarBotao(texto, classe, aoClicar) {
    const botao = criarElemento("button", classe, texto);
    botao.type = "button";
    botao.addEventListener("click", aoClicar);
    return botao;
}

function desenharLista() {
    lista.innerHTML = "";

    if (obrigacoes.length === 0) {
        lista.appendChild(criarElemento("div", "vazio", "Nenhuma obrigação cadastrada."));
        return;
    }

    obrigacoes.forEach((item) => {
        const concluida = item.status === "CONCLUIDA";
        const cartao = criarElemento("div", "item");
        if (concluida) {
            cartao.classList.add("concluida");
        } else if (estaAtrasada(item)) {
            cartao.classList.add("atrasada");
        }

        const topo = criarElemento("div", "item-topo");
        topo.appendChild(criarElemento("h3", "", item.titulo));
        topo.appendChild(criarElemento("span", "etiqueta", item.tipo));
        cartao.appendChild(topo);

        if (item.descricao) {
            cartao.appendChild(criarElemento("p", "", item.descricao));
        }

        const detalhes = criarElemento("div", "detalhes");
        detalhes.appendChild(criarElemento("span", "", "Vencimento: " + formatarData(item.data_vencimento)));
        detalhes.appendChild(criarElemento("span", "", formatarValor(item.valor)));
        let situacao = "Pendente";
        if (concluida) {
            situacao = "Concluída";
        } else if (estaAtrasada(item)) {
            situacao = "Atrasada";
        }
        detalhes.appendChild(criarElemento("span", "", "Situação: " + situacao));
        cartao.appendChild(detalhes);

        const acoes = criarElemento("div", "acoes");
        acoes.appendChild(
            criarBotao(concluida ? "Reabrir" : "Concluir", "pequeno", () => alternarStatus(item))
        );
        acoes.appendChild(criarBotao("Editar", "pequeno secundario", () => editar(item)));
        acoes.appendChild(criarBotao("Excluir", "pequeno perigo", () => excluir(item)));
        cartao.appendChild(acoes);

        lista.appendChild(cartao);
    });
}

function limparFormulario() {
    formulario.reset();
    campos.id.value = "";
    tituloForm.textContent = "Nova obrigação";
    botaoCancelar.hidden = true;
    mostrarErro("");
}

function editar(item) {
    campos.id.value = item.id;
    campos.titulo.value = item.titulo;
    campos.descricao.value = item.descricao;
    campos.tipo.value = item.tipo;
    campos.data.value = item.data_vencimento;
    campos.valor.value = item.valor === null ? "" : item.valor;
    tituloForm.textContent = "Editar obrigação";
    botaoCancelar.hidden = false;
    mostrarErro("");
    formulario.scrollIntoView({ behavior: "smooth" });
}

function montarCorpo(status) {
    return {
        titulo: campos.titulo.value,
        descricao: campos.descricao.value,
        tipo: campos.tipo.value,
        data_vencimento: campos.data.value,
        status: status,
        valor: campos.valor.value,
    };
}

async function alternarStatus(item) {
    const novoStatus = item.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA";
    await fetch(`${API}/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            titulo: item.titulo,
            descricao: item.descricao,
            tipo: item.tipo,
            data_vencimento: item.data_vencimento,
            status: novoStatus,
            valor: item.valor,
        }),
    });
    carregar();
}

async function excluir(item) {
    if (!confirm(`Excluir "${item.titulo}"?`)) {
        return;
    }
    await fetch(`${API}/${item.id}`, { method: "DELETE" });
    carregar();
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mostrarErro("");

    const id = campos.id.value;
    const existente = obrigacoes.find((o) => String(o.id) === id);
    const status = existente ? existente.status : "PENDENTE";

    const resposta = await fetch(id ? `${API}/${id}` : API, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarCorpo(status)),
    });

    if (!resposta.ok) {
        const dados = await resposta.json();
        mostrarErro(dados.erro || "Não foi possível salvar.");
        return;
    }

    limparFormulario();
    carregar();
});

botaoCancelar.addEventListener("click", limparFormulario);

carregar();
