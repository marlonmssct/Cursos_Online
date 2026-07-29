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
    apiKey: "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",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile"
};
