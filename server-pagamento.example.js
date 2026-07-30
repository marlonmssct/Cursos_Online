// ==================================================== //
// MINI-SERVIDOR DE PAGAMENTO (MERCADO PAGO) — NEXA      //
// O Mercado Pago bloqueia (política de segurança própria //
// deles) chamadas diretas do NAVEGADOR ao endpoint de     //
// produção /v1/orders — só aceita chamadas servidor-a-      //
// servidor. Este arquivo existe só por causa disso: guarda    //
// o Access Token aqui (nunca no navegador) e repassa as        //
// duas chamadas que o frontend precisa (criar PIX e consultar   //
// status).                                                        //
//                                                                   //
// Sem framework, sem "npm install" — só Node puro.                   //
//                                                                      //
// Como rodar: node server-pagamento.js                                  //
// Sobe em http://localhost:4000 (rode junto com o Live Server           //
// e o json-server — são 3 processos rodando ao mesmo tempo).            //
// ==================================================== //

const http = require("http");

// Cole aqui o Access Token de PRODUÇÃO do Mercado Pago. Este arquivo roda
// só no seu computador (via "node"), o navegador nunca vê esse valor.
const MP_ACCESS_TOKEN = "COLE_SEU_ACCESS_TOKEN_DE_PRODUCAO_DO_MERCADO_PAGO_AQUI";
const MP_API_BASE = "https://api.mercadopago.com";
const PORTA = 4000;

function enviarJSON(res, status, dados) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(dados));
}

function lerCorpoJSON(req) {
    return new Promise((resolve) => {
        let corpo = "";
        req.on("data", (pedaco) => { corpo += pedaco; });
        req.on("end", () => {
            try { resolve(JSON.parse(corpo || "{}")); } catch (e) { resolve({}); }
        });
    });
}

// ---------------------------------------------------- //
// Cria a cobrança PIX no Mercado Pago (server-to-server, //
// sem CORS envolvido — é o Node chamando, não o navegador). //
// ---------------------------------------------------- //
async function criarPix({ cursoId, usuarioId, preco, titulo, email }) {
    const idempotencia = `mat_${cursoId}_${usuarioId}_${Date.now()}`;
    const valorFormatado = Number(preco).toFixed(2);

    const resp = await fetch(`${MP_API_BASE}/v1/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
            "X-Idempotency-Key": idempotencia
        },
        body: JSON.stringify({
            type: "online",
            total_amount: valorFormatado,
            external_reference: idempotencia,
            processing_mode: "automatic",
            transactions: {
                payments: [{
                    amount: valorFormatado,
                    payment_method: { id: "pix", type: "bank_transfer" },
                    expiration_time: "PT30M"
                }]
            },
            payer: { email: email || "aluno@nexa.com" }
        })
    });

    const corpo = await resp.json();
    const pagamento = corpo?.transactions?.payments?.[0];

    if (!pagamento?.payment_method?.qr_code) {
        throw new Error(corpo?.errors?.[0]?.message || corpo?.message || "Falha ao gerar o PIX no Mercado Pago.");
    }

    return {
        orderId: corpo.id,
        brCode: pagamento.payment_method.qr_code,
        brCodeBase64: `data:image/png;base64,${pagamento.payment_method.qr_code_base64}`,
        status: corpo.status
    };
}

async function consultarPix(orderId) {
    const resp = await fetch(`${MP_API_BASE}/v1/orders/${encodeURIComponent(orderId)}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });
    const corpo = await resp.json();
    if (!resp.ok || !corpo?.status) throw new Error("Falha ao consultar o status do pagamento.");
    return { status: corpo.status, valor: Number(corpo.total_paid_amount || corpo.total_amount || 0) };
}

// ---------------------------------------------------- //
// Servidor HTTP simples: só duas rotas.                 //
// ---------------------------------------------------- //
const servidor = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        });
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORTA}`);

    try {
        if (req.method === "POST" && url.pathname === "/api/pix/criar") {
            const dados = await lerCorpoJSON(req);
            const resultado = await criarPix(dados);
            enviarJSON(res, 200, resultado);
            return;
        }

        if (req.method === "GET" && url.pathname === "/api/pix/status") {
            const resultado = await consultarPix(url.searchParams.get("id"));
            enviarJSON(res, 200, resultado);
            return;
        }

        enviarJSON(res, 404, { erro: "Rota não encontrada." });
    } catch (erro) {
        console.error("Erro no servidor de pagamento:", erro);
        enviarJSON(res, 500, { erro: erro.message || "Erro interno no servidor de pagamento." });
    }
});

servidor.listen(PORTA, () => {
    console.log(`Servidor de pagamento (Mercado Pago) rodando em http://localhost:${PORTA}`);
});
