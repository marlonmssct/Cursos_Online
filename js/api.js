// ==================================================== //
// CONFIGURAÇÃO DE API E SESSÃO COMPARTILHADA - NEXA     //
// O backend é simulado via json-server: todo dado       //
// (cursos, categorias, usuários...) trafega por fetch    //
// nos endpoints REST abaixo. O localStorage guarda       //
// apenas a sessão do usuário logado (sem sessão de       //
// servidor), usada para as validações de cargo (RBAC).   //
// ==================================================== //

const API_URL = "http://localhost:3000";
const NEXA_SESSAO_KEY = "usuarioLogado";

const Sessao = {
    getUsuario() {
        const bruto = localStorage.getItem(NEXA_SESSAO_KEY);
        return bruto ? JSON.parse(bruto) : null;
    },

    setUsuario(usuario) {
        localStorage.setItem(NEXA_SESSAO_KEY, JSON.stringify(usuario));
    },

    logout() {
        localStorage.removeItem(NEXA_SESSAO_KEY);
    }
};
