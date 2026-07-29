// ==================================================== //
// LÓGICA DE VALIDAÇÃO E CADASTRO (PÁGINA CADASTRO)     //
// Backend simulado via json-server (fetch nos endpoints). //
// ==================================================== //

// Captura dos elementos do formulário
const formCadastro = document.getElementById("formCadastro");
const inputNome = document.getElementById("nome");
const inputEmail = document.getElementById("email");
const inputSenha = document.getElementById("senha");
const selectRole = document.getElementById("role");
const feedback = document.getElementById("feedback");

// Função para exibir mensagem de feedback
function exibirFeedback(mensagem, ehSucesso = false) {
    feedback.textContent = mensagem;
    feedback.className = `feedback-box ${ehSucesso ? 'success' : 'error'}`;
    feedback.classList.remove("hidden");
}

// Ouvinte do formulário de cadastro
formCadastro.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Captura e limpa os valores digitados
    const nome = inputNome.value.trim();
    const email = inputEmail.value.trim().toLowerCase();
    const senha = inputSenha.value.trim();
    const role = selectRole.value;

    feedback.classList.add("hidden");

    // 2. Validação: Nome com mínimo de 3 caracteres
    if (nome.length < 3) {
        exibirFeedback("O nome deve ter no mínimo 3 caracteres.");
        return;
    }

    // 3. Validação: Senha com mínimo de 6 caracteres
    if (senha.length < 6) {
        exibirFeedback("A senha deve conter pelo menos 6 caracteres.");
        return;
    }

    try {
        // 4. Checagem de E-mail Único no banco de dados via API json-server
        const checagemEmail = await fetch(`${API_URL}/usuarios?email=${encodeURIComponent(email)}`);

        if (checagemEmail.ok) {
            const usuariosExistentes = await checagemEmail.json();

            // Se encontrou algum usuário com esse e-mail, rejeita o cadastro
            if (usuariosExistentes.length > 0) {
                exibirFeedback("Este e-mail já está em uso por outro usuário.");
                return;
            }
        }

        // 5. Monta o objeto do novo usuário (com status padrão ativo: true)
        const novoUsuario = {
            id: "u_" + Date.now(), // Gera um ID único
            nome: nome,
            email: email,
            senha: senha,
            role: role,
            ativo: true,
            criadoEm: new Date().toISOString()
        };

        // 6. Envia a requisição POST para registrar o usuário na API
        const respostaPost = await fetch(`${API_URL}/usuarios`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novoUsuario)
        });

        if (respostaPost.ok) {
            exibirFeedback("Cadastro realizado com sucesso! Redirecionando para o login...", true);

            // Aguarda 1.5 segundos e redireciona para a tela de login
            setTimeout(() => {
                window.location.href = "../login/index.html";
            }, 1500);
        } else {
            exibirFeedback("Erro ao registrar o usuário na API.");
        }

    } catch (erro) {
        console.error("Erro no cadastro:", erro);
        exibirFeedback("Servidor json-server offline na porta 3000. Inicie com npx json-server db.json");
    }
});
