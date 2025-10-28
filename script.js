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
            if (this.destinoAtual) {
                this.detectarObstaculos();
            }
        }, 8000);
    }

    atualizarStatusPrecisao(precisao) {
        const precisionElement = document.getElementById('precision-status');
        precisionElement.textContent = precisao.charAt(0).toUpperCase() + precisao.slice(1);
        
        precisionElement.className = 'sensor-status';
        if (precisao === "alta") {
            precisionElement.classList.add('precision-high');
        } else if (precisao === "média") {
            precisionElement.classList.add('precision-medium');
        } else {
            precisionElement.classList.add('precision-low');
        }

        if (precisao === "baixa" && this.destinoAtual) {
            this.falar("Atenção: Precisão de localização reduzida. As instruções podem ser menos precisas.");
        }
    }

    iniciarMonitoramentoAmbiente() {
        setInterval(() => {
            if (this.destinoAtual) {
                this.atualizarInformacoesAmbiente();
            }
        }, 10000);
    }

    atualizarInformacoesAmbiente() {
        const informacoes = [
            "Há um cruzamento movimentado a 50 metros à frente",
            "Calçada com desnível a 20 metros",
            "Área com obras na próxima quadra",
            "Faixa de pedestres a 30 metros",
            "Parada de ônibus a 40 metros à direita"
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
            { tipo: "lixeira", distancia: 5, direcao: "frente" },
            { tipo: "poste", distancia: 8, direcao: "esquerda" },
            { tipo: "buraco", distancia: 3, direcao: "frente" },
            { tipo: "obras", distancia: 15, direcao: "direita" }
        ];
        
        this.obstaculosProximos = [obstaculos[Math.floor(Math.random() * obstaculos.length)]];
        
        this.obstaculosProximos.forEach(obstaculo => {
            if (obstaculo.distancia < 10) {
                this.alertarObstaculo(obstaculo);
            }
        });
    }

    alertarObstaculo(obstaculo) {
        const alertElement = document.getElementById('obstacle-alert');
        alertElement.textContent = `⚠️ Obstáculo próximo: ${obstaculo.tipo} a ${obstaculo.distancia}m à ${obstaculo.direcao}`;
        alertElement.classList.remove('hidden');
        
        this.falar(`Atenção: ${obstaculo.tipo} a ${obstaculo.distancia} metros à ${obstaculo.direcao}`);
        
        if (obstaculo.distancia < 5) {
            this.ativarFeedbackTatil();
        }
        
        setTimeout(() => {
            alertElement.classList.add('hidden');
        }, 5000);
    }

    ativarFeedbackTatil() {
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        this.mostrarTexto("📳 Feedback tátil ativado", "instruction");
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
            this.falar("Sistema NAVESense ativado. Diga 'Ajuda' para conhecer os comandos.");
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
            } else {
                this.falar("Ocorreu um erro no reconhecimento de voz.");
            }
            
            setTimeout(() => {
                if (this.recognition) {
                    this.recognition.start();
                }
            }, 3000);
        };

        this.recognition.onend = () => {
            setTimeout(() => {
                if (this.recognition) {
                    this.recognition.start();
                }
            }, 500);
        };

        this.solicitarPermissaoMicrofone();
    }

    solicitarPermissaoMicrofone() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    this.recognition.start();
                })
                .catch(err => {
                    this.falar("Não foi possível acessar o microfone. Verifique as permissões.");
                    this.atualizarStatus("Erro de microfone");
                });
        } else {
            this.recognition.start();
        }
    }

    processarComando(comando) {
        this.mostrarTexto(`Comando detectado: "${comando}"`, "instruction");
        
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
        else {
            this.falar("Comando não reconhecido. Diga 'Ajuda' para ver os comandos disponíveis.");
        }
    }

    fornecerDetalhesAmbiente() {
        if (this.obstaculosProximos.length > 0) {
            let descricao = "Obstáculos detectados: ";
            this.obstaculosProximos.forEach((obstaculo, index) => {
                descricao += `${obstaculo.tipo} a ${obstaculo.distancia} metros à ${obstaculo.direcao}. `;
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
            this.falar("Modo segurança ativado. Alertas sonoros para obstáculos ativados.");
            this.mostrarTexto("🛡️ Modo segurança ATIVADO - Alertas sonoros para obstáculos", "instruction");
            securityElement.textContent = "Ativado";
            securityElement.className = 'sensor-status security-active';
        } else {
            this.falar("Modo segurança desativado.");
            this.mostrarTexto("🔓 Modo segurança DESATIVADO", "instruction");
            securityElement.textContent = "Desativado";
            securityElement.className = 'sensor-status';
        }
    }

    fornecerInformacoesPrecisao() {
        let mensagemPrecisao = "";
        
        switch(this.precisaoAtual) {
            case "alta":
                mensagemPrecisao = "Precisão de localização está alta. As instruções têm máxima confiabilidade.";
                break;
            case "média":
                mensagemPrecisao = "Precisão de localização está média. Algumas instruções podem ter pequenas variações.";
                break;
            case "baixa":
                mensagemPrecisao = "Precisão de localização está baixa. Recomendo verificar pontos de referência visuais ou táteis.";
                break;
        }
        
        this.falar(mensagemPrecisao);
        this.mostrarTexto(`🎯 ${mensagemPrecisao}`, "instruction");
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
        navElement.textContent = "Ativo";
        navElement.className = 'sensor-status navigation-active';
        
        this.falar(`Iniciando navegação para ${destino}. Calculando rota...`);
        this.mostrarTexto(`📍 Destino definido: ${destino}`, "destination");
        
        setTimeout(() => {
            this.calcularRota(destino);
        }, 2000);
    }

    calcularRota(destino) {
        this.instrucoesAtuais = [
            `Saindo da localização atual. Siga em frente por 50 metros na calçada com piso tátil.`,
            `Após 50 metros, você encontrará um cruzamento. Aguarde o sinal sonoro para atravessar.`,
            `Após atravessar, vire à direita na Rua das Flores. A calçada tem 1.5 metros de largura.`,
            `Siga por 200 metros. Há uma parada de ônibus a 100 metros à sua direita.`,
            `No próximo semáforo com sinal sonoro, atravesse a rua.`,
            `Após atravessar, continue em frente por 150 metros. Você chegará ao seu destino: ${destino}. A entrada tem 3 degraus.`
        ];
        
        this.instrucaoAtualIndex = 0;
        
        let mensagemInicial = `Rota calculada para ${destino}. Você terá ${this.instrucoesAtuais.length} instruções. `;
        mensagemInicial += `Precisão de localização: ${this.precisaoAtual}. `;
        
        if (this.modoSeguranca) {
            mensagemInicial += "Modo segurança ativado. Você receberá alertas de obstáculos.";
        }
        
        this.falar(mensagemInicial);
        this.mostrarTexto(`🗺️ ${mensagemInicial}`, "destination");
        
        this.proximaInstrucao();
    }

    proximaInstrucao() {
        if (this.instrucaoAtualIndex < this.instrucoesAtuais.length) {
            const instrucao = this.instrucoesAtuais[this.instrucaoAtualIndex];
            this.ultimaInstrucao = instrucao;
            
            this.falar(instrucao);
            this.mostrarTexto(`📌 ${instrucao}`, "instruction");
            
            this.instrucaoAtualIndex++;
            
            setTimeout(() => {
                this.proximaInstrucao();
            }, 10000);
        } else {
            this.falar(`Você chegou ao seu destino: ${this.destinoAtual}. Navegação concluída.`);
            this.mostrarTexto(`🎉 Você chegou ao destino: ${this.destinoAtual}`, "destination");
            
            // Resetar status de navegação
            const navElement = document.getElementById('navigation-status');
            navElement.textContent = "Inativo";
            navElement.className = 'sensor-status';
            
            this.destinoAtual = null;
            this.instrucoesAtuais = [];
        }
    }

    pararNavegacao() {
        if (this.destinoAtual) {
            this.falar(`Navegação para ${this.destinoAtual} cancelada.`);
            this.mostrarTexto(`❌ Navegação cancelada: ${this.destinoAtual}`, "alert");
            
            // Resetar status de navegação
            const navElement = document.getElementById('navigation-status');
            navElement.textContent = "Inativo";
            navElement.className = 'sensor-status';
            
            this.destinoAtual = null;
            this.instrucoesAtuais = [];
            this.instrucaoAtualIndex = 0;
        } else {
            this.falar("Não há nenhuma navegação em andamento.");
        }
    }

    repetirInstrucao() {
        if (this.ultimaInstrucao) {
            this.falar(this.ultimaInstrucao);
            this.mostrarTexto(`🔁 Repetindo: ${this.ultimaInstrucao}`, "instruction");
        } else {
            this.falar("Não há instruções para repetir.");
        }
    }

    fornecerLocalizacaoAtual() {
        const localizacoes = [
            "Você está na Rua Principal, próximo ao número 123.",
            "Você está na Avenida Central, próximo ao Parque Municipal.",
            "Você está na Praça da Liberdade, próximo à fonte central."
        ];
        
        const localizacao = localizacoes[Math.floor(Math.random() * localizacoes.length)];
        
        this.falar(localizacao);
        this.mostrarTexto(`📍 ${localizacao}`, "instruction");
    }

    falar(texto) {
        // Se já está falando, espera um pouco antes de falar novamente
        if (this.isSpeaking) {
            setTimeout(() => this.falar(texto), 1000);
            return;
        }

        this.isSpeaking = true;

        if (this.synth.speaking) {
            this.synth.cancel();
        }

        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(texto);
            utterance.lang = 'pt-BR';
            utterance.rate = 0.9;
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
        const novoElemento = document.createElement('div');
        novoElemento.className = tipo;
        novoElemento.innerHTML = texto;
        output.insertBefore(novoElemento, output.firstChild);
        
        if (output.children.length > 10) {
            output.removeChild(output.lastChild);
        }
    }

    atualizarStatus(status) {
        document.getElementById('status').innerHTML = `<div class="pulse-dot"></div>${status}`;
    }

    mostrarFeedbackComando(feedback) {
        document.getElementById('command-feedback').textContent = feedback;
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
            "Precisão - Informa sobre a precisão atual do sistema"
        ];

        this.falar("Comandos disponíveis: " + comandos.join(". "));
        
        let ajudaHTML = "<h3>Comandos de Voz Disponíveis:</h3>";
        comandos.forEach(comando => {
            ajudaHTML += `<div class="instruction">${comando}</div>`;
        });
        
        this.mostrarTexto(ajudaHTML);
    }
}

// Inicializa o NAVESense quando a página carrega
const navesense = new NAVESense();
