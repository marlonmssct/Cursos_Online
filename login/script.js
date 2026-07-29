// ==================================================== //
// LÓGICA DE AUTENTICAÇÃO E LOGIN (PÁGINA LOGIN)       //
// ==================================================== //

// Endereço base da API json-server
const API_URL = "http://localhost:3000";

// Captura dos elementos do formulário no DOM
const formLogin = document.getElementById("formLogin"); // Formulário de login
const inputEmail = document.getElementById("email");    // Campo do e-mail
const inputSenha = document.getElementById("senha");    // Campo da senha
const feedback = document.getElementById("feedback");    // Caixa de mensagens de erro/sucesso

// Função para exibir mensagem de erro na tela
function exibirErro(mensagem) {
    feedback.textContent = mensagem; // Define o texto do erro
    feedback.className = "feedback-box error"; // Aplica estilo de erro
    feedback.classList.remove("hidden"); // Exibe o container
}

// Ouvinte de evento para quando o usuário envia o formulário de login
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault(); // Impede o recarregamento padrão da página

    // Captura e limpa os valores digitados
    const emailDigitado = inputEmail.value.trim().toLowerCase();
    const senhaDigitada = inputSenha.value.trim();

    // Limpa feedbacks anteriores
    feedback.classList.add("hidden");

    try {
        // Consulta na API json-server filtrando pelo e-mail informado
        const resposta = await fetch(`${API_URL}/usuarios?email=${encodeURIComponent(emailDigitado)}`);
        
        if (!resposta.ok) {
            exibirErro("Erro de conexão com o servidor na porta 3000.");
            return;
        }

        const usuariosEncontrados = await resposta.json();

        // 1. Verifica se encontrou algum usuário com esse e-mail
        if (usuariosEncontrados.length === 0) {
            exibirErro("Nenhum usuário cadastrado com este e-mail.");
            return;
        }

        const usuario = usuariosEncontrados[0];

        // 2. Valida a senha digitada
        if (usuario.senha !== senhaDigitada) {
            exibirErro("Senha incorreta! Tente novamente.");
            return;
        }

        // 3. Verifica se a conta do usuário está ativa
        if (!usuario.ativo) {
            exibirErro("Sua conta está desativada. Entre em contato com a administração.");
            return;
        }

        // 4. Se passou em todas as validações, guarda o usuário e seu role na sessão (localStorage)
        localStorage.setItem("usuarioLogado", JSON.stringify(usuario));

        console.log(`✅ Login realizado com sucesso como: ${usuario.nome} (${usuario.role})`);

        // Redireciona para a página de Catálogo de Cursos
        window.location.href = "../catalogo/index.html";

    } catch (erro) {
        console.error("Erro na autenticação:", erro);
        exibirErro("O servidor json-server não está respondendo. Verifique se executou: npx json-server db.json");
    }
});
