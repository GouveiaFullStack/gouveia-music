# Documentação — Mousiké

Esta pasta reúne a documentação técnica, registros de evolução e informações sobre a modelagem do projeto **Mousiké**.

A documentação está organizada por finalidade para facilitar a consulta e acompanhar a evolução da aplicação ao longo do desenvolvimento.

---

## Banco de dados

A documentação atual da modelagem do banco está disponível em:

[`database.md`](./database.md)

Esse documento descreve:

- entidades principais;
- tabelas de relacionamento;
- cardinalidades;
- constraints;
- índices;
- regras de exclusão;
- decisões de modelagem;
- regras de domínio relacionadas ao banco.

O schema Prisma utilizado pela aplicação está localizado em:

```text
backend/prisma/schema.prisma
```

---

## Documentação técnica

A documentação técnica geral do projeto está localizada em:

```text
technical/
```

Arquivos disponíveis:

- [`Mousike_Documentacao_Tecnica.pdf`](./technical/Mousike_Documentacao_Tecnica.pdf)
- [`Mousike_Documentacao_Tecnica.docx`](./technical/Mousike_Documentacao_Tecnica.docx)

Esses documentos registram decisões técnicas e informações gerais sobre a construção da Mousiké.

---

## Histórico de evolução

Os registros de marcos importantes do desenvolvimento ficam em:

```text
changelog/
```

Cada marco possui sua própria pasta, identificada pela data e pela etapa concluída.

### 22 de setembro de 2026 — Backend MVP

```text
changelog/2026-09-22-backend-mvp/
```

Arquivos:

- [`Relatório de evolução — PDF`](./changelog/2026-09-22-backend-mvp/Mousike_Relatorio_Evolucao_2026-09-22.pdf)
- [`Relatório de evolução — DOCX`](./changelog/2026-09-22-backend-mvp/Mousike_Relatorio_Evolucao_2026-09-22.docx)

Esse marco registra a conclusão e organização do **Backend MVP da Mousiké**, incluindo:

- autenticação e autorização;
- usuários e artistas;
- publicação de músicas;
- uploads;
- playlists;
- favoritos;
- histórico de reprodução;
- sistema de seguidores;
- busca;
- recomendações;
- organização da estrutura backend;
- limpeza de código legado;
- atualização da documentação.

---

## Estrutura

```text
docs/
├── README.md
├── database.md
│
├── technical/
│   ├── Mousike_Documentacao_Tecnica.docx
│   └── Mousike_Documentacao_Tecnica.pdf
│
└── changelog/
    └── 2026-09-22-backend-mvp/
        ├── Mousike_Relatorio_Evolucao_2026-09-22.docx
        └── Mousike_Relatorio_Evolucao_2026-09-22.pdf
```

---

## Próximos registros

Novos documentos poderão ser adicionados conforme o projeto atingir novos marcos, por exemplo:

```text
changelog/
├── 2026-09-22-backend-mvp/
├── frontend-authentication/
├── frontend-player/
└── first-deploy/
```

A ideia é manter um histórico claro da evolução da Mousiké sem sobrecarregar a documentação técnica principal.

---

## Projeto principal

Para informações gerais, tecnologias, funcionalidades e instruções de execução, consulte o:

[`README.md principal`](../README.md)
