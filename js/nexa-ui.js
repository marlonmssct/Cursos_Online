// ==================================================== //
// CAMADA DE INTERFACE COMPARTILHADA — NEXA (NexaUI)     //
// Centraliza TODO o feedback visual da plataforma:      //
// toasts, confirmações e diálogos de sucesso/erro, com  //
// a identidade da marca aplicada via SweetAlert2.       //
//                                                        //
// Também cuida dos detalhes de presença: header que      //
// reage ao scroll, entrada suave dos blocos e o fundo    //
// animado (Vanta.js) do banner do catálogo.              //
//                                                        //
// Regras de projeto:                                     //
//  - Autocontido em uma IIFE: só expõe window.NexaUI.    //
//  - Não conhece nem altera nenhuma regra de negócio.    //
//  - Degrada com elegância: se o SweetAlert2, o three.js //
//    ou o Vanta não carregarem (CDN fora do ar / sem     //
//    internet), a página continua 100% funcional.        //
// ==================================================== //

(function () {
    "use strict";

    // Selo hexagonal da NEXA usado como ícone dos diálogos de marca
    const BRAND_ICON = `
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 5 L88 26.5 C92 28.8 94 32.3 94 36.8 L94 63.2 C94 67.7 92 71.2 88 73.5 L50 95 C46 97.3 42 97.3 38 95 L12 73.5 C8 71.2 6 67.7 6 63.2 L6 36.8 C6 32.3 8 28.8 12 26.5 Z" fill="#2D1C52"/>
            <path d="M30 68 V34 C30 30 35 28 38 31 L64 64 C67 67 72 65 72 61 V30" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M42 43.5 L57 51 L42 58.5 Z" fill="#F3A730"/>
        </svg>
    `;

    const temSwal = () => typeof window.Swal !== "undefined";

    // ---------------------------------------------------- //
    // 1. TOASTS (canto superior direito, some sozinho)      //
    // ---------------------------------------------------- //
    function toast(mensagem, icone = "success", duracao = 2400) {
        if (!temSwal()) return;

        Swal.fire({
            toast: true,
            position: "top-end",
            icon: icone,
            title: mensagem,
            showConfirmButton: false,
            timer: duracao,
            timerProgressBar: true,
            customClass: { popup: "nexa-toast" }
        });
    }

    const toastSucesso = (mensagem) => toast(mensagem, "success", 2400);
    const toastErro = (mensagem) => toast(mensagem, "error", 2800);
    const toastInfo = (mensagem) => toast(mensagem, "info", 2200);

    // ---------------------------------------------------- //
    // 2. CONFIRMAÇÃO DE AÇÃO                                //
    // Retorna Promise<boolean>. Sem SweetAlert2 disponível,  //
    // cai no confirm() nativo — a ação nunca fica travada.   //
    // ---------------------------------------------------- //
    async function confirmar({
        titulo,
        texto = "",
        confirmText = "Confirmar",
        cancelText = "Cancelar",
        icon = "warning",
        perigoso = true
    }) {
        if (!temSwal()) {
            return window.confirm(`${titulo}\n\n${texto}`);
        }

        const resultado = await Swal.fire({
            title: titulo,
            text: texto,
            icon,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            reverseButtons: true,
            focusCancel: perigoso,
            buttonsStyling: false,
            customClass: {
                popup: "nexa-swal",
                confirmButton: `btn ${perigoso ? "btn-danger" : "btn-primary"}`,
                cancelButton: "btn btn-outline"
            }
        });

        return resultado.isConfirmed;
    }

    // ---------------------------------------------------- //
    // 3. DIÁLOGOS DE RESULTADO (sucesso / erro / marca)     //
    // ---------------------------------------------------- //
    async function sucesso({ titulo, texto = "", confirmText = "Continuar" }) {
        if (!temSwal()) return;

        await Swal.fire({
            icon: "success",
            title: titulo,
            text: texto,
            confirmButtonText: confirmText,
            buttonsStyling: false,
            customClass: { popup: "nexa-swal", confirmButton: "btn btn-primary" }
        });
    }

    async function erro({ titulo, texto = "", confirmText = "Entendi" }) {
        if (!temSwal()) return;

        await Swal.fire({
            icon: "error",
            title: titulo,
            text: texto,
            confirmButtonText: confirmText,
            buttonsStyling: false,
            customClass: { popup: "nexa-swal", confirmButton: "btn btn-secondary" }
        });
    }

    // Diálogo com o selo da NEXA no lugar do ícone genérico
    async function marca({ titulo, texto = "", confirmText = "Continuar" }) {
        if (!temSwal()) return;

        await Swal.fire({
            iconHtml: BRAND_ICON,
            title: titulo,
            text: texto,
            confirmButtonText: confirmText,
            buttonsStyling: false,
            customClass: {
                popup: "nexa-swal nexa-swal-gate",
                icon: "nexa-swal-brand-icon",
                confirmButton: "btn btn-primary"
            }
        });
    }

    // Aviso de "carregando" enquanto uma requisição acontece
    function carregando(titulo = "Processando...") {
        if (!temSwal()) return;

        Swal.fire({
            title: titulo,
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: { popup: "nexa-swal" },
            didOpen: () => Swal.showLoading()
        });
    }

    function fecharCarregando() {
        if (temSwal() && Swal.isLoading()) Swal.close();
    }

    // ---------------------------------------------------- //
    // 4. HEADER QUE REAGE AO SCROLL                         //
    // Só adiciona/remove uma classe: a sombra e o fio de     //
    // marca aparecem quando a página sai do topo.            //
    // ---------------------------------------------------- //
    function ativarHeaderScroll() {
        const header = document.querySelector(".global-header");
        if (!header) return;

        const sincronizar = () => header.classList.toggle("is-scrolled", window.scrollY > 8);

        sincronizar();
        window.addEventListener("scroll", sincronizar, { passive: true });
    }

    // ---------------------------------------------------- //
    // 5. ENTRADA SUAVE DOS BLOCOS AO ENTRAR NA TELA         //
    // Aplica a classe .nexa-reveal em [data-reveal] quando   //
    // o elemento aparece na viewport.                        //
    // ---------------------------------------------------- //
    function ativarRevelacao() {
        const alvos = document.querySelectorAll("[data-reveal]");
        if (alvos.length === 0) return;

        // Sem IntersectionObserver, revela tudo de uma vez.
        if (!("IntersectionObserver" in window)) {
            alvos.forEach((el) => el.classList.add("nexa-reveal"));
            return;
        }

        const observador = new IntersectionObserver((entradas, obs) => {
            entradas.forEach((entrada) => {
                if (!entrada.isIntersecting) return;

                const atraso = Number(entrada.target.dataset.revealDelay || 0);
                entrada.target.style.animationDelay = `${atraso}ms`;
                entrada.target.classList.add("nexa-reveal");
                obs.unobserve(entrada.target);
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

        alvos.forEach((el) => observador.observe(el));
    }

    // ---------------------------------------------------- //
    // 6. FUNDO ANIMADO VANTA.JS (usado só no banner do       //
    // catálogo — um ponto de impacto, nada além disso).      //
    // Se three.js/Vanta não estiverem disponíveis, o         //
    // gradiente CSS original do banner permanece visível.    //
    // ---------------------------------------------------- //
    function iniciarVanta(seletor) {
        const alvo = document.querySelector(seletor);
        if (!alvo) return null;

        if (typeof window.VANTA === "undefined" || typeof window.VANTA.NET !== "function") return null;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

        try {
            const efeito = window.VANTA.NET({
                el: alvo,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.0,
                minWidth: 200.0,
                scale: 1.0,
                scaleMobile: 1.0,
                color: 0xf3a730,          // CTA dourado da paleta oficial
                backgroundColor: 0x1c1826, // Fundo escuro oficial
                points: 9.0,
                maxDistance: 21.0,
                spacing: 18.0,
                showDots: true
            });

            alvo.classList.add("vanta-ativo");
            return efeito;
        } catch (e) {
            console.warn("Fundo animado indisponível; mantendo o gradiente padrão do banner.");
            return null;
        }
    }

    // ---------------------------------------------------- //
    // 7. INICIALIZAÇÃO AUTOMÁTICA DOS DETALHES DE PRESENÇA  //
    // ---------------------------------------------------- //
    document.addEventListener("DOMContentLoaded", () => {
        ativarHeaderScroll();
        ativarRevelacao();
    });

    // ---------------------------------------------------- //
    // API PÚBLICA                                           //
    // ---------------------------------------------------- //
    window.NexaUI = {
        BRAND_ICON,
        toast,
        toastSucesso,
        toastErro,
        toastInfo,
        confirmar,
        sucesso,
        erro,
        marca,
        carregando,
        fecharCarregando,
        iniciarVanta,
        ativarRevelacao
    };
})();
