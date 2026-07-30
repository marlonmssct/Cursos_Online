// ==================================================== //
// CHECKOUT DE PAGAMENTO (MERCADO PAGO / PIX) — NEXA     //
// Autocontido em uma IIFE, mesmo molde de                //
// js/perfil-modal.js e js/support-chat.js.                //
//                                                          //
// O Mercado Pago bloqueia chamadas diretas do NAVEGADOR     //
// ao endpoint de produção /v1/orders — só aceita chamadas    //
// servidor-a-servidor. Por isso este arquivo NÃO fala direto  //
// com o Mercado Pago: ele fala com o mini-servidor local        //
// (server-pagamento.js), que guarda o Access Token e repassa    //
// as duas chamadas que precisamos (criar PIX e consultar status). //
// ==================================================== //

(function () {
    "use strict";

    const CONFIG = window.NEXA_PAYMENT_CONFIG || {};
    const MP_PROXY_BASE = CONFIG.mpProxyUrl || "http://localhost:4000";

    async function criarOrderMercadoPago(curso, usuario) {
        let resp;
        try {
            resp = await fetch(`${MP_PROXY_BASE}/api/pix/criar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cursoId: curso.id,
                    usuarioId: usuario.id,
                    preco: curso.preco,
                    titulo: curso.titulo,
                    email: usuario.email
                })
            });
        } catch (erro) {
            throw new Error("Não foi possível falar com o servidor de pagamento local. Ele está rodando? (node server-pagamento.js)");
        }

        const dados = await resp.json().catch(() => null);
        if (!resp.ok || !dados?.brCode) {
            throw new Error(dados?.erro || "Falha ao gerar o PIX no Mercado Pago.");
        }

        return dados; // { orderId, brCode, brCodeBase64, status }
    }

    async function consultarOrderMercadoPago(orderId) {
        const resp = await fetch(`${MP_PROXY_BASE}/api/pix/status?id=${encodeURIComponent(orderId)}`);
        const dados = await resp.json().catch(() => null);
        if (!resp.ok || !dados?.status) throw new Error("Falha ao consultar o status do pagamento.");
        return dados; // { status, valor }
    }

    function montarModalPixMercadoPago(curso, cobranca) {
        const precoFormatado = Number(curso.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.innerHTML = `
            <div class="modal-card modal-card-sm">
                <div class="modal-header">
                    <h3>Pagar com PIX</h3>
                    <button type="button" class="btn-close" data-fechar-pix>&times;</button>
                </div>

                <p class="pix-pagamento-curso">${curso.titulo}</p>
                <p class="pix-pagamento-preco">${precoFormatado}</p>

                <div class="pix-qrcode-wrapper">
                    <img class="pix-qrcode-img" src="${cobranca.brCodeBase64}" alt="QR Code para pagamento via PIX">
                </div>

                <div class="pix-copia-cola">
                    <input type="text" readonly value="${cobranca.brCode}" id="mpBrCodeInput">
                    <button type="button" class="btn btn-outline btn-sm" id="btnCopiarMpPix">Copiar</button>
                </div>

                <div class="pix-status" id="mpPixStatus">
                    <span class="pix-spinner" aria-hidden="true"></span>
                    <span>Aguardando confirmação do pagamento...</span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    // Abre o modal de PIX via Mercado Pago: cria a order real, acompanha o status
    // por polling e resolve a Promise quando o pagamento é de fato confirmado.
    function abrirPagamentoPixMercadoPago(curso, usuario) {
        return new Promise((resolve, reject) => {

            let intervaloId = null;
            let encerrado = false;
            let overlay = null;

            function encerrar(resultado) {
                if (encerrado) return;
                encerrado = true;
                if (intervaloId) clearInterval(intervaloId);
                if (overlay) overlay.remove();
                resolve(resultado);
            }

            criarOrderMercadoPago(curso, usuario).then((cobranca) => {
                if (encerrado) return;

                overlay = montarModalPixMercadoPago(curso, cobranca);
                ligarEventos(cobranca);
            }).catch((erro) => {
                reject(erro);
            });

            function ligarEventos(cobranca) {
                overlay.querySelectorAll("[data-fechar-pix]").forEach((el) => {
                    el.addEventListener("click", () => encerrar({ pago: false, motivo: "cancelado" }));
                });
                overlay.addEventListener("click", (e) => {
                    if (e.target === overlay) encerrar({ pago: false, motivo: "cancelado" });
                });

                const inputCodigo = overlay.querySelector("#mpBrCodeInput");
                const btnCopiar = overlay.querySelector("#btnCopiarMpPix");
                btnCopiar.addEventListener("click", async () => {
                    try {
                        await navigator.clipboard.writeText(inputCodigo.value);
                        btnCopiar.textContent = "Copiado!";
                        setTimeout(() => { btnCopiar.textContent = "Copiar"; }, 1800);
                    } catch (e) {
                        inputCodigo.select();
                    }
                });

                const statusEl = overlay.querySelector("#mpPixStatus");

                intervaloId = setInterval(async () => {
                    try {
                        const atual = await consultarOrderMercadoPago(cobranca.orderId);

                        if (atual.status === "processed") {
                            statusEl.className = "pix-status pago";
                            statusEl.innerHTML = "<span>✅ Pagamento confirmado!</span>";
                            setTimeout(() => {
                                encerrar({ pago: true, valor: atual.valor });
                            }, 900);
                        } else if (["expired", "canceled"].includes(atual.status)) {
                            encerrar({ pago: false, motivo: "expirado" });
                        }
                    } catch (erro) {
                        console.warn("Erro ao consultar status do pagamento Mercado Pago.", erro);
                    }
                }, 3000);
            }
        });
    }

    window.NexaPagamento = {
        abrirPagamentoPixMercadoPago
    };
})();
