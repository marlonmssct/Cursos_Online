// ==================================================== //
// CONFIGURAÇÃO DO CHAT DE SUPORTE — NEXA                //
// 1. Copie este arquivo para "chat-config.js" (mesma pasta). //
// 2. Gere uma chave gratuita em https://console.groq.com/keys //
// 3. Cole a chave abaixo, em apiKey.                    //
//                                                        //
// "chat-config.js" está no .gitignore: sua chave real     //
// nunca é enviada para o GitHub. Sem esse arquivo (ou com  //
// a chave de exemplo), o widget de chat some sozinho da    //
// tela — o resto do site continua funcionando normalmente. //
// ==================================================== //

window.NEXA_CHAT_CONFIG = {
    apiKey: "COLE_SUA_CHAVE_GRATUITA_DA_GROQ_AQUI",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile"
};
