class NAVESense {
    constructor() {
        this.isListening = false;
        this.navigationActive = false;
        this.currentDestination = null;
        this.currentRoute = null;
        this.currentStepIndex = 0;
        this.speechSynthesis = window.speechSynthesis;
        this.recognition = null;
        this.activationWord = 'navesense';
        this.maps = {};
        this.userLocation = null;
        this.userLocationMarker = null;
        this.routeLine = null;
        this.navigationInterval = null;
        this.positionSimulation = null;
        
        // Configurações
        this.settings = {
            voiceSpeed: 0.9,
            voicePitch: 1,
            guidanceFrequency: 10, // segundos
            stepDuration: 20 // segundos por instrução
        };

        this.destinations = {
            'casa': { name: 'sua residência', coords: [-23.5630, -46.6525] },
            'trabalho': { name: 'seu local de trabalho', coords: [-23.5489, -46.6388] },
            'mercado': { name: 'supermercado mais próximo', coords: [-23.5570, -46.6420] },
            'farmácia': { name: 'farmácia mais próxima', coords: [-23.5550, -46.6400] },
            'hospital': { name: 'hospital mais próximo', coords: [-23.5510, -46.6450] },
            'shopping': { name: 'shopping center', coords: [-23.5470, -46.6480] },
            'padaria': { name: 'padaria mais próxima', coords: [-23.5530, -46.6430] },
            'parque': { name: 'parque municipal', coords: [-23.5500, -46.6500] },
            'avenida paulista': { name: 'Avenida Paulista', coords: [-23.5630, -46.6530] },
            'centro': { name: 'centro da cidade', coords: [-23.5505, -46.6333] },
            'estação': { name: 'estação de metrô', coords: [-23.5520, -46.6350] },
            'praça': { name: 'praça central', coords: [-23.5490, -46.6370] }
        };

        this.init();
    }

    async init() {
        try {
            await this.initMaps();
            this.initSpeechRecognition();
            await this.getCurrentLocation();
            this.setupEventListeners();
            
            this.speak(
                `Sistema NAVESense inicializado com sucesso. Diga "${this.activationWord}" para ativar o sistema de navegação.`,
                this.settings.voiceSpeed
            );
            
            this.startContinuousListening();
            this.showFeedback("Sistema pronto - Aguardando comandos de voz");
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.speak("Erro ao inicializar o sistema. Verifique sua conexão e tente novamente.");
        }
    }

    initMaps() {
        return new Promise((resolve) => {
            // Mapa da tela inicial
            this.maps.welcome = L.map('welcome-map', {
                zoomControl: false,
                attributionControl: false
            }).setView([-23.5505, -46.6333], 13);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 18
            }).addTo(this.maps.welcome);

            // Marcador central com animação
            const welcomeMarker = L.marker([-23.5505, -46.6333], {
                icon: L.divIcon({
                    className: 'welcome-marker',
                    html: '📍<div class="pulse-effect"></div>',
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                })
            }).addTo(this.maps.welcome)
              .bindPopup('<div class="map-popup">📍 NAVESense<br><small>Pronto para navegar</small></div>')
              .openPopup();

            // Mapa da navegação
            this.maps.navigation = L.map('navigation-map', {
                zoomControl: true,
                attributionControl: false
            }).setView([-23.5505, -46.6333], 13);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 18
            }).addTo(this.maps.navigation);

            // Controles personalizados
            this.maps.navigation.zoomControl.setPosition('bottomright');
            
            resolve();
        });
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            throw new Error('Reconhecimento de voz não suportado');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'pt-BR';
        this.recognition.maxAlternatives = 3;
        this.recognition.interimResults = true;

        this.recognition.onstart = () => {
            this.showVoiceActivation();
            this.isListening = true;
            this.showFeedback("Sistema ouvindo...");
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Feedback visual do que está sendo dito
            if (interimTranscript) {
                this.showFeedback(`Ouvindo: "${interimTranscript}"`, 'interim');
            }

            if (finalTranscript) {
                this.processVoiceCommand(finalTranscript.toLowerCase());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Erro no reconhecimento:', event.error);
            
            if (event.error !== 'no-speech') {
                this.showFeedback("Erro no reconhecimento de voz", 'error');
                this.speak("Desculpe, houve um erro no reconhecimento de voz. Tente novamente.");
            }
            
            this.hideVoiceActivation();
        };

        this.recognition.onend = () => {
            this.hideVoiceActivation();
            this.isListening = false;
            
            // Reiniciar escuta após breve pausa
            setTimeout(() => {
                if (!this.isListening) {
                    this.startContinuousListening();
                }
            }, 500);
        };
    }

    startContinuousListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (error) {
                console.log('Reiniciando reconhecimento de voz...');
                setTimeout(() => this.startContinuousListening(), 1000);
            }
        }
    }

    processVoiceCommand(command) {
        console.log('Comando processado:', command);
        this.showFeedback(`Comando: "${command}"`, 'recognized');

        // Palavra de ativação
        if (this.containsActivationWord(command)) {
            this.handleActivation();
            return;
        }

        // Comandos de navegação
        if (this.isNavigationCommand(command)) {
            this.handleNavigationCommand(command);
            return;
        }

        // Comandos de controle
        if (this.isControlCommand(command)) {
            this.handleControlCommand(command);
            return;
        }

        // Comando não reconhecido
        this.handleUnknownCommand(command);
    }

    containsActivationWord(command) {
        const activationPatterns = [
            this.activationWord,
            'nave sense',
            'nave sentido',
            'activate',
            'ativar'
        ];
        
        return activationPatterns.some(pattern => command.includes(pattern));
    }

    isNavigationCommand(command) {
        const navigationPatterns = [
            'ir para',
            'navegar até',
            'vá para',
            'quero ir',
            'me leve',
            'direções para'
        ];
        
        return navigationPatterns.some(pattern => command.includes(pattern));
    }

    isControlCommand(command) {
        const controlPatterns = {
            'onde estou': 'location',
            'localização atual': 'location',
            'parar navegação': 'stop',
            'cancelar navegação': 'stop',
            'repetir instrução': 'repeat',
            'dizer novamente': 'repeat',
            'próxima instrução': 'next',
            'próximo passo': 'next',
            'ajuda': 'help',
            'comandos disponíveis': 'help'
        };

        for (const [pattern, action] of Object.entries(controlPatterns)) {
            if (command.includes(pattern)) {
                return action;
            }
        }
        
        return false;
    }

    handleActivation() {
        this.showFeedback("NAVESense ativado! Para onde você quer ir?");
        this.speak(
            "NAVESense ativado. Diga 'ir para' seguido do seu destino. Por exemplo: 'ir para shopping' ou 'ir para Avenida Paulista'.",
            this.settings.voiceSpeed
        );
    }

    handleNavigationCommand(command) {
        const destination = this.extractDestination(command);
        
        if (destination) {
            this.startNavigation(destination);
        } else {
            this.speak(
                "Não entendi o destino. Por favor, diga claramente para onde você quer ir. Exemplo: 'ir para shopping' ou 'ir para farmácia'.",
                this.settings.voiceSpeed
            );
        }
    }

    handleControlCommand(action) {
        switch (action) {
            case 'location':
                this.getCurrentLocation(true);
                break;
            case 'stop':
                this.stopNavigation();
                break;
            case 'repeat':
                this.repeatCurrentInstruction();
                break;
            case 'next':
                this.nextInstruction();
                break;
            case 'help':
                this.giveHelp();
                break;
        }
    }

    handleUnknownCommand(command) {
        this.speak(
            `Comando não reconhecido: "${command}". Diga "ajuda" para ver os comandos disponíveis.`,
            this.settings.voiceSpeed
        );
    }

    extractDestination(command) {
        // Remove frases de comando
        const cleanedCommand = command
            .replace(/(ir para|navegar até|vá para|quero ir|me leve|direções para)/g, '')
            .trim();

        if (!cleanedCommand || cleanedCommand.length < 2) {
            return null;
        }

        // Procura por destinos conhecidos
        for (const [key, destination] of Object.entries(this.destinations)) {
            if (cleanedCommand.includes(key)) {
                return destination;
            }
        }

        // Destino customizado
        return {
            name: cleanedCommand,
            coords: this.generateRandomCoordinates()
        };
    }

    generateRandomCoordinates() {
        // Gera coordenadas aleatórias próximas à localização central
        const baseLat = -23.5505;
        const baseLng = -46.6333;
        const variation = 0.02;
        
        return [
            baseLat + (Math.random() - 0.5) * variation,
            baseLng + (Math.random() - 0.5) * variation
        ];
    }

    async startNavigation(destination) {
        try {
            this.navigationActive = true;
            this.currentDestination = destination;
            
            // Transição para tela de navegação
            this.switchToNavigationScreen();
            
            // Gerar rota
            await this.generateRoute(destination);
            
            // Atualizar interface
            this.updateNavigationInterface();
            
            // Iniciar navegação
            this.speak(
                `Navegação iniciada para ${destination.name}. ${this.currentRoute.instructions[0]}`,
                this.settings.voiceSpeed
            );
            
            this.showFeedback(`Navegando para: ${destination.name}`);
            
            // Iniciar simulações
            this.startNavigationSimulation();
            
        } catch (error) {
            console.error('Erro ao iniciar navegação:', error);
            this.speak("Erro ao iniciar a navegação. Tente novamente.");
            this.stopNavigation();
        }
    }

    switchToNavigationScreen() {
        document.getElementById('voice-command-screen').classList.remove('active');
        document.getElementById('navigation-screen').classList.add('active');
        
        // Pequeno delay para animação
        setTimeout(() => {
            this.maps.navigation.invalidateSize();
        }, 100);
    }

    async generateRoute(destination) {
        return new Promise((resolve) => {
            const startCoords = this.userLocation || [-23.5505, -46.6333];
            const endCoords = destination.coords;
            
            // Gerar pontos intermediários para a rota
            const path = this.generateRoutePath(startCoords, endCoords);
            
            this.currentRoute = {
                destination: destination.name,
                destinationCoords: endCoords,
                startCoords: startCoords,
                path: path,
                instructions: this.generateInstructions(destination.name, path.length),
                steps: this.generateSteps(destination.name, path.length),
                totalTime: this.calculateRouteTime(path),
                totalDistance: this.calculateRouteDistance(path),
                currentPosition: 0
            };

            this.currentStepIndex = 0;
            resolve();
        });
    }

    generateRoutePath(start, end) {
        const path = [start];
        const segments = 8;
        
        for (let i = 1; i < segments; i++) {
            const progress = i / segments;
            const lat = start[0] + (end[0] - start[0]) * progress + (Math.random() - 0.5) * 0.005;
            const lng = start[1] + (end[1] - start[1]) * progress + (Math.random() - 0.5) * 0.005;
            path.push([lat, lng]);
        }
        
        path.push(end);
        return path;
    }

    generateInstructions(destinationName, pathLength) {
        const baseInstructions = [
            `Saindo da sua localização atual, siga em frente por 50 metros`,
            `Vire à esquerda na próxima rua`,
            `Continue por 200 metros até o cruzamento`,
            `Vire à direita na Avenida Principal`,
            `Siga em frente por 150 metros`,
            `Mantenha-se à direita`,
            `Seu destino ${destinationName} estará à sua direita`,
            `Você chegou ao seu destino`
        ];

        return baseInstructions.slice(0, Math.min(pathLength, baseInstructions.length));
    }

    generateSteps(destinationName, pathLength) {
        const distances = ['50m', '100m', '200m', '150m', '120m', '80m', '0m'];
        const actions = [
            'Siga em frente',
            'Vire à esquerda',
            'Vire à direita',
            'Continue reto',
            'Mantenha-se à direita',
            `Destino: ${destinationName}`
        ];

        return Array.from({ length: Math.min(pathLength - 1, 6) }, (_, i) => ({
            distance: distances[i] || '100m',
            action: actions[i] || 'Continue seguindo'
        }));
    }

    calculateRouteTime(path) {
        const baseTime = Math.max(5, Math.floor(path.length * 2.5));
        return `${baseTime} min`;
    }

    calculateRouteDistance(path) {
        const baseDistance = (path.length * 0.3).toFixed(1);
        return `${baseDistance} km`;
    }

    updateNavigationInterface() {
        // Atualizar informações principais
        document.getElementById('current-destination').textContent = this.currentRoute.destination;
        document.getElementById('map-destination').textContent = this.currentRoute.destination;
        document.getElementById('map-time').textContent = this.currentRoute.totalTime;
        document.getElementById('map-distance').textContent = this.currentRoute.totalDistance;
        
        // Atualizar mapa
        this.updateMapWithRoute();
        
        // Atualizar instruções
        this.updateNavigationDisplay();
    }

    updateMapWithRoute() {
        // Limpar mapa anterior
        this.clearNavigationMap();

        // Adicionar marcador de início
        L.marker(this.currentRoute.startCoords, {
            icon: L.divIcon({
                className: 'start-marker',
                html: '🟢<div class="pulse-effect green"></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.maps.navigation)
          .bindPopup('<div class="map-popup">📍 Sua localização atual</div>');

        // Adicionar marcador de destino
        L.marker(this.currentRoute.destinationCoords, {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '🔴',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.maps.navigation)
          .bindPopup(`<div class="map-popup">📍 Destino: ${this.currentRoute.destination}</div>`);

        // Adicionar linha da rota
        this.routeLine = L.polyline(this.currentRoute.path, {
            color: '#00E5FF',
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            className: 'route-line'
        }).addTo(this.maps.navigation);

        // Ajustar visualização
        const bounds = L.latLngBounds(this.currentRoute.path);
        this.maps.navigation.fitBounds(bounds, { padding: [30, 30] });
    }

    clearNavigationMap() {
        this.maps.navigation.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                this.maps.navigation.removeLayer(layer);
            }
        });
        
        this.userLocationMarker = null;
        this.routeLine = null;
    }

    updateNavigationDisplay() {
        const instructionElement = document.getElementById('instruction-text');
        const stepsContainer = document.getElementById('steps-container');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        
        if (!this.currentRoute || this.currentStepIndex >= this.currentRoute.instructions.length) {
            return;
        }

        // Instrução atual
        instructionElement.innerHTML = `<p>${this.currentRoute.instructions[this.currentStepIndex]}</p>`;
        
        // Próximos passos
        stepsContainer.innerHTML = this.currentRoute.steps
            .slice(this.currentStepIndex)
            .map((step, index) => `
                <div class="step ${index === 0 ? 'next-step' : ''}">
                    <span class="distance">${step.distance}</span>
                    <span class="action">${step.action}</span>
                </div>
            `).join('');
        
        // Progresso
        const progress = (this.currentStepIndex / (this.currentRoute.instructions.length - 1)) * 100;
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${Math.round(progress)}%`;
    }

    startNavigationSimulation() {
        let stepTimer = 0;
        let guidanceTimer = 0;
        
        this.navigationInterval = setInterval(() => {
            if (!this.navigationActive) return;

            stepTimer++;
            guidanceTimer++;

            // Avançar instrução
            if (stepTimer >= this.settings.stepDuration) {
                this.nextInstruction();
                stepTimer = 0;
            }

            // Orientação contextual
            if (guidanceTimer >= this.settings.guidanceFrequency) {
                this.giveContextualGuidance();
                guidanceTimer = 0;
            }

            // Atualizar posição no mapa
            this.updateUserPositionOnMap();

        }, 1000);
    }

    updateUserPositionOnMap() {
        if (!this.currentRoute?.path) return;

        const totalSteps = this.currentRoute.path.length - 1;
        const progress = Math.min(this.currentStepIndex / (this.currentRoute.instructions.length - 1), 0.95);
        const pathIndex = Math.floor(progress * totalSteps);
        const segmentProgress = (progress * totalSteps) - pathIndex;

        const startPoint = this.currentRoute.path[pathIndex];
        const endPoint = this.currentRoute.path[pathIndex + 1];
        
        const currentLat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress;
        const currentLng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress;

        // Atualizar ou criar marcador
        if (this.userLocationMarker) {
            this.maps.navigation.removeLayer(this.userLocationMarker);
        }

        this.userLocationMarker = L.marker([currentLat, currentLng], {
            icon: L.divIcon({
                className: 'user-marker',
                html: '👤<div class="pulse-effect blue"></div>',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            }),
            zIndexOffset: 1000
        }).addTo(this.maps.navigation)
          .bindPopup('<div class="map-popup">👤 Sua posição atual</div>');
    }

    nextInstruction() {
        if (!this.currentRoute || this.currentStepIndex >= this.currentRoute.instructions.length - 1) {
            this.completeNavigation();
            return;
        }

        this.currentStepIndex++;
        this.speak(this.currentRoute.instructions[this.currentStepIndex], this.settings.voiceSpeed);
        this.updateNavigationDisplay();

        // Feedback tátil (se suportado)
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }

    completeNavigation() {
        this.speak(
            `Você chegou ao seu destino: ${this.currentRoute.destination}. Navegação finalizada.`,
            this.settings.voiceSpeed
        );
        
        this.showFeedback("🎉 Destino alcançado!");
        
        setTimeout(() => {
            this.stopNavigation();
        }, 8000);
    }

    giveContextualGuidance() {
        const guidanceMessages = [
            "Caminho livre à frente, continue em frente",
            "Mantenha-se no lado direito da calçada",
            "Atenção: desnível à frente em 10 metros",
            "Você está no caminho correto para o destino",
            "Próximo ponto de virada em aproximadamente 100 metros",
            "Calçada ampla à sua frente, pode prosseguir com segurança",
            "Área plana e livre de obstáculos",
            "Siga em frente, trajeto seguro"
        ];
        
        const randomMessage = guidanceMessages[Math.floor(Math.random() * guidanceMessages.length)];
        this.speak(randomMessage, this.settings.voiceSpeed + 0.1);
    }

    stopNavigation() {
        if (!this.navigationActive) return;

        this.navigationActive = false;
        this.currentDestination = null;
        this.currentRoute = null;
        this.currentStepIndex = 0;

        // Limpar intervalos
        if (this.navigationInterval) {
            clearInterval(this.navigationInterval);
            this.navigationInterval = null;
        }

        // Voltar para tela principal
        document.getElementById('navigation-screen').classList.remove('active');
        document.getElementById('voice-command-screen').classList.add('active');

        // Resetar mapa
        this.clearNavigationMap();
        this.maps.welcome.invalidateSize();

        this.speak(
            "Navegação parada. Diga NAVESense quando quiser iniciar uma nova rota.",
            this.settings.voiceSpeed
        );
        
        this.showFeedback("Navegação finalizada");
    }

    repeatCurrentInstruction() {
        if (this.navigationActive && this.currentRoute) {
            this.speak(this.currentRoute.instructions[this.currentStepIndex], this.settings.voiceSpeed);
            this.showFeedback("Instrução repetida");
        } else {
            this.speak("Nenhuma navegação ativa no momento.");
        }
    }

    getCurrentLocation(speakResult = false) {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                this.userLocation = [-23.5505, -46.6333];
                document.getElementById('current-location-text').textContent = "Localização aproximada";
                if (speakResult) this.speak("Localização aproximada determinada.");
                resolve();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = [
                        position.coords.latitude,
                        position.coords.longitude
                    ];
                    
                    document.getElementById('current-location-text').textContent = 
                        "Localização precisa determinada via GPS";
                    
                    if (speakResult) {
                        this.speak("Sua localização atual foi verificada com precisão pelo GPS.");
                    }
                    
                    // Atualizar mapa de boas-vindas
                    if (this.maps.welcome) {
                        this.maps.welcome.setView(this.userLocation, 15);
                    }
                    
                    resolve();
                },
                (error) => {
                    this.userLocation = [-23.5505, -46.6333];
                    document.getElementById('current-location-text').textContent = 
                        "Localização aproximada - Centro da cidade";
                    
                    if (speakResult) {
                        this.speak("Localização aproximada determinada. Continue seguindo as instruções de voz.");
                    }
                    
                    resolve();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        });
    }

    giveHelp() {
        const helpMessage = `
            Comandos disponíveis: 
            "NAVESense" para ativar,
            "Ir para [destino]" para navegar,
            "Onde estou" para localização,
            "Repetir instrução" para repetir,
            "Parar navegação" para finalizar.
            Diga o comando claramente e aguarde a resposta.
        `.replace(/\s+/g, ' ').trim();
        
        this.speak(helpMessage, this.settings.voiceSpeed);
        this.showFeedback("Ajuda: Comandos de voz disponíveis");
    }

    setupEventListeners() {
        // Teclas de atalho para desenvolvimento/acessibilidade
        document.addEventListener('keydown', (e) => {
            if (e.altKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.startNavigation(this.destinations.shopping);
                        break;
                    case '2':
                        e.preventDefault();
                        this.stopNavigation();
                        break;
                    case '3':
                        e.preventDefault();
                        this.speak("Teste de voz do sistema NAVESense");
                        break;
                }
            }
        });

        // Redimensionamento da janela
        window.addEventListener('resize', () => {
            Object.values(this.maps).forEach(map => {
                map.invalidateSize();
            });
        });
    }

    speak(text, rate = null) {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = rate || this.settings.voiceSpeed;
        utterance.pitch = this.settings.voicePitch;
        utterance.volume = 1;

        utterance.onstart = () => {
            console.log('🔊 Falando:', text);
        };

        utterance.onerror = (error) => {
            console.error('Erro na síntese de voz:', error);
        };

        utterance.onend = () => {
            console.log('✅ Fala concluída');
        };

        this.speechSynthesis.speak(utterance);
    }

    showVoiceActivation() {
        document.getElementById('voice-activation').classList.add('active');
    }

    hideVoiceActivation() {
        document.getElementById('voice-activation').classList.remove('active');
    }

    showFeedback(text, type = 'normal') {
        const feedback = document.getElementById('voice-feedback');
        const feedbackText = document.getElementById('feedback-text');
        
        feedbackText.textContent = text;
        feedback.className = 'voice-feedback active';
        
        if (type !== 'normal') {
            feedback.classList.add(type);
        }
        
        setTimeout(() => {
            feedback.classList.remove('active', type);
        }, 3000);
    }

    // Destructor para limpeza
    destroy() {
        this.stopNavigation();
        
        if (this.recognition) {
            this.recognition.stop();
        }
        
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        
        Object.values(this.maps).forEach(map => {
            map.remove();
        });
    }
}

// Inicialização segura
document.addEventListener('DOMContentLoaded', () => {
    window.navesense = new NAVESense();
});

// Prevenir recarregamento da página
window.addEventListener('beforeunload', (e) => {
    if (window.navesense?.navigationActive) {
        e.preventDefault();
        e.returnValue = 'A navegação está ativa. Tem certeza que deseja sair?';
    }
});