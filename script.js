class NAVESense {
    constructor() {
        this.recognition = null;
        this.synth = window.speechSynthesis;
        this.destinoAtual = null;
        this.instrucoesAtuais = [];
        this.instrucaoAtualIndex = 0;
        this.ultimaInstrucao = "";
        this.obstaculosProximos = [];
        this.modoSeguranca = false;
        this.precisaoAtual = "alta";
        this.isSpeaking = false;
        this.navegacaoAtiva = false;
        this.timeoutInstrucoes = null;
        this.passosTotais = 0;
        this.passosAtuais = 0;
        
        document.addEventListener('DOMContentLoaded', () => {
            this.iniciarSistema();
            this.configurarRecursosAvancados();
        });
    }

    iniciarSistema() {
        this.atualizarStatus("NAVESense inicializando...");
        this.mostrarTexto("Sistema NAVESense carregando. Diga 'Ajuda' para conhecer os comandos disponíveis.", "welcome");
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.falar("Seu navegador não suporta reconhecimento de voz. Recomendamos usar Chrome, Edge ou Safari.");
            this.atualizarStatus("Navegador não compatível");
            return;
        }

        this.iniciarReconhecimento();
        this.iniciarMonitoramentoAmbiente();
    }

    configurarRecursosAvancados() {
        this.simularSensores();
    }

    simularSensores() {
        setInterval(() => {
            const precisions = ["alta", "média", "baixa"];
            this.precisaoAtual = precisions[Math.floor(Math.random() * precisions.length)];
            this.atualizarStatusPrecisao(this.precisaoAtual);
        }, 15000);

        setInterval(() => {
            if (this.destinoAtual && this.navegacaoAtiva) {
                this.detectarObstaculos();
            }
        }, 8000);
    }

    atualizarStatusPrecisao(precisao) {
        const precisionElement = document.getElementById('precision-status');
        if (precisionElement) {
            precisionElement.textContent = precisao.charAt(0).toUpperCase() + precisao.slice(1);
            
            precisionElement.className = 'sensor-status';
            if (precisao === "alta") {
                precisionElement.classList.add('precision-high');
            } else if (precisao === "média") {
                precisionElement.classList.add('precision-medium');
            } else {
                precisionElement.classList.add('precision-low');
            }

            if (precisao === "baixa" && this.destinoAtual && this.navegacaoAtiva) {
                this.falar("Atenção: Precisão de localização reduzida. Conte os passos com mais atenção.");
            }
        }
    }

    iniciarMonitoramentoAmbiente() {
        setInterval(() => {
            if (this.destinoAtual && this.navegacaoAtiva) {
                this.atualizarInformacoesAmbiente();
            }
        }, 10000);
    }

    atualizarInformacoesAmbiente() {
        const informacoes = [
            "Há um cruzamento movimentado em aproximadamente 70 passos à frente",
            "Calçada com desnível em cerca de 30 passos",
            "Área com obras na próxima quadra, em aproximadamente 100 passos",
            "Faixa de pedestres em cerca de 40 passos",
            "Parada de ônibus em aproximadamente 60 passos à direita"
        ];
        
        const info = informacoes[Math.floor(Math.random() * informacoes.length)];
        
        if (Math.random() > 0.7) {
            this.mostrarTexto(`ℹ️ ${info}`, "context-info");
            
            if (this.modoSeguranca) {
                this.falar(info);
            }
        }
    }

    detectarObstaculos() {
        const obstaculos = [
            { tipo: "lixeira", passos: 7, direcao: "frente" },
            { tipo: "poste", passos: 12, direcao: "esquerda" },
            { tipo: "buraco", passos: 4, direcao: "frente" },
            { tipo: "obras", passos: 20, direcao: "direita" },
            { tipo: "rampa de acesso", passos: 15, direcao: "frente" },
            { tipo: "bancos", passos: 10, direcao: "direita" }
        ];
        
        this.obstaculosProximos = [obstaculos[Math.floor(Math.random() * obstaculos.length)]];
        
        this.obstaculosProximos.forEach(obstaculo => {
            if (obstaculo.passos < 15) {
                this.alertarObstaculo(obstaculo);
            }
        });
    }

    alertarObstaculo(obstaculo) {
        const alertElement = document.getElementById('obstacle-alert');
        alertElement.textContent = `⚠️ Obstáculo próximo: ${obstaculo.tipo} a ${obstaculo.passos} passos à ${obstaculo.direcao}`;
        alertElement.classList.remove('hidden');
        
        let mensagemObstaculo = "";
        if (obstaculo.passos <= 5) {
            mensagemObstaculo = `Cuidado! ${obstaculo.tipo} muito próximo, a apenas ${obstaculo.passos} passos à ${obstaculo.direcao}. Desvie com cuidado.`;
        } else if (obstaculo.passos <= 10) {
            mensagemObstaculo = `Atenção: ${obstaculo.tipo} a ${obstaculo.passos} passos à ${obstaculo.direcao}. Prepare-se para desviar.`;
        } else {
            mensagemObstaculo = `${obstaculo.tipo} a ${obstaculo.passos} passos à ${obstaculo.direcao}. Continue atento.`;
        }
        
        this.falar(mensagemObstaculo);
        
        if (obstaculo.passos < 8) {
            this.ativarFeedbackTatil();
        }
        
        setTimeout(() => {
            alertElement.classList.add('hidden');
        }, 5000);
    }

    ativarFeedbackTatil() {
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        this.mostrarTexto("📳 Alerta tátil ativado", "instruction");
    }

    iniciarReconhecimento() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'pt-BR';
        this.recognition.maxAlternatives = 3;

        this.recognition.onstart = () => {
            this.atualizarStatus("NAVESense ativo. Ouvindo comandos...");
            this.mostrarFeedbackComando("Sistema pronto. Pode falar.");
            this.falar("Sistema NAVESense ativado com sucesso. Diga 'Ajuda' para conhecer todos os comandos disponíveis.");
        };

        this.recognition.onresult = (event) => {
            const resultado = event.results[event.results.length - 1];
            const comando = resultado[0].transcript.toLowerCase();
            const confianca = resultado[0].confidence;
            
            this.mostrarFeedbackComando(`Comando detectado: "${comando}" (${Math.round(confianca * 100)}% de confiança)`);
            this.processarComando(comando);
        };

        this.recognition.onerror = (event) => {
            console.error('Erro no reconhecimento:', event.error);
            
            if (event.error === 'not-allowed') {
                this.falar("Permissão de microfone negada. Por favor, permita o uso do microfone.");
                this.atualizarStatus("Permissão negada");
            } else if (event.error === 'audio-capture') {
                this.falar("Não foi possível acessar o microfone. Verifique se o microfone está conectado.");
            } else {
                this.falar("Ocorreu um erro no reconhecimento de voz. Tente novamente.");
            }
            
            setTimeout(() => {
                if (this.recognition) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Erro ao reiniciar reconhecimento:', e);
                    }
                }
            }, 3000);
        };

        this.recognition.onend = () => {
            setTimeout(() => {
                if (this.recognition) {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Erro ao reiniciar reconhecimento:', e);
                    }
                }
            }, 1000);
        };

        this.solicitarPermissaoMicrofone();
    }

    solicitarPermissaoMicrofone() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.error('Erro ao iniciar reconhecimento:', e);
                    }
                })
                .catch(err => {
                    this.falar("Não foi possível acessar o microfone. Verifique as permissões do seu navegador.");
                    this.atualizarStatus("Erro de microfone");
                    console.error('Erro de permissão do microfone:', err);
                });
        } else {
            try {
                this.recognition.start();
            } catch (e) {
                console.error('Erro ao iniciar reconhecimento:', e);
            }
        }
    }

    processarComando(comando) {
        this.mostrarTexto(`🎤 Comando: "${comando}"`, "instruction");
        
        if (comando.includes('iniciar navegação') || comando.includes('navegar para') || comando.includes('ir para')) {
            this.iniciarNavegacao(comando);
        }
        else if (comando.includes('parar navegação') || comando.includes('cancelar navegação')) {
            this.pararNavegacao();
        }
        else if (comando.includes('repetir instrução') || comando.includes('repetir')) {
            this.repetirInstrucao();
        }
        else if (comando.includes('ajuda') || comando.includes('comandos')) {
            this.mostrarAjuda();
        }
        else if (comando.includes('onde estou') || comando.includes('localização atual')) {
            this.fornecerLocalizacaoAtual();
        }
        else if (comando.includes('detalhes do ambiente') || comando.includes('obstáculos')) {
            this.fornecerDetalhesAmbiente();
        }
        else if (comando.includes('modo segurança') || comando.includes('segurança')) {
            this.alterarModoSeguranca();
        }
        else if (comando.includes('precisão') || comando.includes('precisao')) {
            this.fornecerInformacoesPrecisao();
        }
        else if (comando.includes('quantos passos') || comando.includes('progresso')) {
            this.fornecerProgresso();
        }
        else {
            this.falar("Comando não reconhecido. Diga 'Ajuda' para ver os comandos disponíveis.");
        }
    }

    fornecerDetalhesAmbiente() {
        if (this.obstaculosProximos.length > 0) {
            let descricao = "Obstáculos detectados: ";
            this.obstaculosProximos.forEach((obstaculo, index) => {
                descricao += `${obstaculo.tipo} a ${obstaculo.passos} passos à ${obstaculo.direcao}. `;
            });
            
            this.falar(descricao);
            this.mostrarTexto(`📊 ${descricao}`, "obstacle-info");
        } else {
            this.falar("Nenhum obstáculo detectado nas proximidades. Ambiente livre para navegação.");
            this.mostrarTexto("✅ Nenhum obstáculo detectado nas proximidades", "instruction");
        }
    }

    alterarModoSeguranca() {
        this.modoSeguranca = !this.modoSeguranca;
        const securityElement = document.getElementById('security-status');
        
        if (this.modoSeguranca) {
            this.falar("Modo segurança ativado. Alertas sonoros para obstáculos ativados. Você receberá alertas com antecedência.");
            this.mostrarTexto("🛡️ Modo segurança ATIVADO - Alertas avançados para obstáculos", "instruction");
            if (securityElement) {
                securityElement.textContent = "Ativado";
                securityElement.className = 'sensor-status security-active';
            }
        } else {
            this.falar("Modo segurança desativado.");
            this.mostrarTexto("🔓 Modo segurança DESATIVADO", "instruction");
            if (securityElement) {
                securityElement.textContent = "Desativado";
                securityElement.className = 'sensor-status';
            }
        }
    }

    fornecerInformacoesPrecisao() {
        let mensagemPrecisao = "";
        
        switch(this.precisaoAtual) {
            case "alta":
                mensagemPrecisao = "Precisão de localização está alta. Conte os passos normalmente, as instruções são confiáveis.";
                break;
            case "média":
                mensagemPrecisao = "Precisão de localização está média. Preste atenção aos pontos de referência e conte os passos com cuidado.";
                break;
            case "baixa":
                mensagemPrecisao = "Precisão de localização está baixa. Use a bengala com atenção e confirme os pontos de referência.";
                break;
        }
        
        this.falar(mensagemPrecisao);
        this.mostrarTexto(`🎯 ${mensagemPrecisao}`, "instruction");
    }

    fornecerProgresso() {
        if (this.navegacaoAtiva && this.passosTotais > 0) {
            const progresso = Math.round((this.passosAtuais / this.passosTotais) * 100);
            const passosRestantes = this.passosTotais - this.passosAtuais;
            
            let mensagem = `Você já deu ${this.passosAtuais} passos de ${this.passosTotais} totais. `;
            mensagem += `Isso representa ${progresso}% do percurso. `;
            mensagem += `Faltam aproximadamente ${passosRestantes} passos para chegar ao destino.`;
            
            this.falar(mensagem);
            this.mostrarTexto(`📈 Progresso: ${this.passosAtuais}/${this.passosTotais} passos (${progresso}%)`, "instruction");
        } else {
            this.falar("Não há uma navegação ativa no momento.");
        }
    }

    iniciarNavegacao(comando) {
        let destino = comando.replace(/iniciar navegação|navegar para|ir para/g, '').trim();
        destino = destino.replace(/ para | até | ao | à | no | na /g, ' ').trim();
        
        if (!destino) {
            this.falar("Por favor, especifique um destino. Exemplo: Iniciar navegação para shopping central");
            return;
        }

        this.destinoAtual = destino;
        
        // Atualizar status de navegação
        const navElement = document.getElementById('navigation-status');
        if (navElement) {
            navElement.textContent = "Ativo";
            navElement.className = 'sensor-status navigation-active';
        }
        
        this.falar(`Iniciando navegação para ${destino}. Calculando rota baseada em passos...`);
        this.mostrarTexto(`📍 Destino definido: ${destino}`, "destination");
        
        setTimeout(() => {
            this.calcularRota(destino);
        }, 2000);
    }

    calcularRota(destino) {
        // Simulação de rota com base em passos
        this.instrucoesAtuais = [
            { 
                texto: `Saindo da localização atual. Siga em frente por aproximadamente 70 passos na calçada com piso tátil.`,
                passos: 70
            },
            { 
                texto: `Após 70 passos, você encontrará um cruzamento. Aguarde o sinal sonoro para atravessar.`,
                passos: 0
            },
            { 
                texto: `Após atravessar, vire à direita. Siga por mais 140 passos. A calçada é ampla.`,
                passos: 140
            },
            { 
                texto: `Continue em frente por 85 passos. Há uma parada de ônibus à sua direita.`,
                passos: 85
            },
            { 
                texto: `No próximo semáforo com sinal sonoro, atravesse a rua com cuidado.`,
                passos: 0
            },
            { 
                texto: `Após atravessar, continue em frente por 105 passos. Você chegará ao seu destino: ${destino}. A entrada tem 3 degraus.`,
                passos: 105
            }
        ];
        
        // Calcular total de passos
        this.passosTotais = this.instrucoesAtuais.reduce((total, instrucao) => total + instrucao.passos, 0);
        this.passosAtuais = 0;
        this.instrucaoAtualIndex = 0;
        this.navegacaoAtiva = true;
        
        let mensagemInicial = `Rota calculada para ${destino}. O percurso tem aproximadamente ${this.passosTotais} passos. `;
        mensagemInicial += `Precisão de localização: ${this.precisaoAtual}. `;
        
        if (this.modoSeguranca) {
            mensagemInicial += "Modo segurança ativado. Você receberá alertas de obstáculos com antecedência.";
        }
        
        this.falar(mensagemInicial);
        this.mostrarTexto(`🗺️ Rota: ${this.passosTotais} passos totais`, "destination");
        
        // Iniciar instruções
        this.proximaInstrucao();
    }

    proximaInstrucao() {
        if (!this.navegacaoAtiva) return;
        
        if (this.instrucaoAtualIndex < this.instrucoesAtuais.length) {
            const instrucaoObj = this.instrucoesAtuais[this.instrucaoAtualIndex];
            this.ultimaInstrucao = instrucaoObj.texto;
            
            this.falar(instrucaoObj.texto);
            this.mostrarTexto(`📌 ${instrucaoObj.texto}`, "instruction");
            
            // Atualizar contagem de passos
            this.passosAtuais += instrucaoObj.passos;
            
            this.instrucaoAtualIndex++;
            
            // Agendar próxima instrução (simulando tempo de caminhada)
            // Baseado em aproximadamente 2 segundos por passo
            const tempoInstrucao = instrucaoObj.passos > 0 ? (instrucaoObj.passos * 2000) + 5000 : 10000;
            
            this.timeoutInstrucoes = setTimeout(() => {
                this.proximaInstrucao();
            }, tempoInstrucao);
        } else {
            this.finalizarNavegacao();
        }
    }

    finalizarNavegacao() {
        this.falar(`Navegação concluída! Você chegou ao seu destino: ${this.destinoAtual}. Foram dados aproximadamente ${this.passosTotais} passos no total.`);
        this.mostrarTexto(`🎉 Destino alcançado: ${this.destinoAtual} (${this.passosTotais} passos)`, "destination");
        
        // Resetar status de navegação
        const navElement = document.getElementById('navigation-status');
        if (navElement) {
            navElement.textContent = "Inativo";
            navElement.className = 'sensor-status';
        }
        
        this.destinoAtual = null;
        this.instrucoesAtuais = [];
        this.instrucaoAtualIndex = 0;
        this.navegacaoAtiva = false;
        this.passosTotais = 0;
        this.passosAtuais = 0;
        
        if (this.timeoutInstrucoes) {
            clearTimeout(this.timeoutInstrucoes);
            this.timeoutInstrucoes = null;
        }
    }

    pararNavegacao() {
        if (this.navegacaoAtiva) {
            this.falar(`Navegação para ${this.destinoAtual} cancelada. Você deu ${this.passosAtuais} passos.`);
            this.mostrarTexto(`❌ Navegação cancelada: ${this.destinoAtual} (${this.passosAtuais} passos dados)`, "alert");
            
            // Resetar status de navegação
            const navElement = document.getElementById('navigation-status');
            if (navElement) {
                navElement.textContent = "Inativo";
                navElement.className = 'sensor-status';
            }
            
            this.destinoAtual = null;
            this.instrucoesAtuais = [];
            this.instrucaoAtualIndex = 0;
            this.navegacaoAtiva = false;
            this.passosTotais = 0;
            this.passosAtuais = 0;
            
            if (this.timeoutInstrucoes) {
                clearTimeout(this.timeoutInstrucoes);
                this.timeoutInstrucoes = null;
            }
        } else {
            this.falar("Não há nenhuma navegação em andamento.");
        }
    }

    repetirInstrucao() {
        if (this.ultimaInstrucao) {
            this.falar(this.ultimaInstrucao);
            this.mostrarTexto(`🔁 Repetindo: ${this.ultimaInstrucao}`, "instruction");
        } else {
            this.falar("Não há instruções para repetir no momento.");
        }
    }

    fornecerLocalizacaoAtual() {
        const localizacoes = [
            "Você está na Rua Carvalho de Freitas n° 450,Vila Andrade São paulo, próximo ao colégio visconde de porto seguro. Há um prédio chamado Passeio morumbi a aproximadamente 30 passos à frente.",
            "Você está na Rua Carvalho de Freitas n° 450,Vila Andrade São paulo, próximo ao colégio visconde de porto seguro. Há um prédio chamado Passeio morumbi a aproximadamente 30 passos à frente.",
        ];
        
        const localizacao = localizacoes[Math.floor(Math.random() * localizacoes.length)];
        
        this.falar(localizacao);
        this.mostrarTexto(`📍 ${localizacao}`, "instruction");
    }

    falar(texto) {
        return new Promise((resolve) => {
            if (this.isSpeaking) {
                setTimeout(() => {
                    this.falar(texto).then(resolve);
                }, 1000);
                return;
            }

            this.isSpeaking = true;

            if (this.synth.speaking) {
                this.synth.cancel();
            }

            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'pt-BR';
            utterance.rate = 0.85; // Velocidade mais lenta para melhor compreensão
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('Erro na síntese de fala:', event);
                this.isSpeaking = false;
                resolve();
            };
            
            this.synth.speak(utterance);
        });
    }

    mostrarTexto(texto, tipo = "instruction") {
        const output = document.getElementById('output');
        if (!output) return;
        
        const novoElemento = document.createElement('div');
        novoElemento.className = tipo;
        novoElemento.innerHTML = texto;
        output.insertBefore(novoElemento, output.firstChild);
        
        if (output.children.length > 15) {
            output.removeChild(output.lastChild);
        }
    }

    atualizarStatus(status) {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = `<div class="pulse-dot"></div>${status}`;
        }
    }

    mostrarFeedbackComando(feedback) {
        const feedbackElement = document.getElementById('command-feedback');
        if (feedbackElement) {
            feedbackElement.textContent = feedback;
        }
    }

    mostrarAjuda() {
        const comandos = [
            "Iniciar navegação para [destino] - Inicia rota para um local",
            "Parar navegação - Cancela a navegação atual", 
            "Repetir instrução - Repete a última instrução",
            "Ajuda - Lista todos os comandos disponíveis",
            "Onde estou? - Fornece informações sobre a localização atual",
            "Detalhes do ambiente - Informações sobre obstáculos próximos",
            "Modo segurança - Ativa alertas sonoros para obstáculos",
            "Precisão - Informa sobre a precisão atual do sistema",
            "Quantos passos - Mostra o progresso da navegação"
        ];

        this.falar("Comandos disponíveis no NAVESense: " + comandos.join(". "));
        
        let ajudaHTML = "<h3>Comandos de Voz Disponíveis:</h3>";
        comandos.forEach(comando => {
            ajudaHTML += `<div class="instruction">${comando}</div>`;
        });
        
        this.mostrarTexto(ajudaHTML);
    }
}

// Inicializa o NAVESense quando a página carrega
const navesense = new NAVESense();
