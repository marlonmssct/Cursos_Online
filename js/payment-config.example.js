// ==================================================== //
// CONFIGURAÇÃO DE PAGAMENTO (MERCADO PAGO) — NEXA       //
// 1. Copie este arquivo para "payment-config.js" (mesma pasta). //
// 2. Copie também server-pagamento.example.js para              //
//    server-pagamento.js e cole lá o seu Access Token de         //
//    produção do Mercado Pago (nunca aqui — o navegador           //
//    nunca deve ver essa chave).                                   //
// 3. Rode "node server-pagamento.js" e deixe rodando.                //
// ==================================================== //

window.NEXA_PAYMENT_CONFIG = {
    mpProxyUrl: "http://localhost:4000"
};
