CREATE TABLE IF NOT EXISTS obrigacao (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(120) NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    tipo VARCHAR(20) NOT NULL DEFAULT 'DAS',
    data_vencimento DATE NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'PENDENTE',
    valor NUMERIC(10, 2),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO obrigacao (titulo, descricao, tipo, data_vencimento, status, valor) VALUES
('DAS do MEI', 'Guia mensal do Simples Nacional', 'DAS', CURRENT_DATE + 5, 'PENDENTE', 81.05),
('Declaração Anual do MEI', 'Entregar a DASN-SIMEI até o prazo', 'Declaração', CURRENT_DATE + 30, 'PENDENTE', NULL),
('Renovação do alvará', 'Alvará de funcionamento da prefeitura', 'Alvará', CURRENT_DATE - 3, 'CONCLUIDA', 150.00);
