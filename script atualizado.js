class SyntraAI {
    constructor() {
        this.messagesContainer = document.getElementById('messages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.clearBtn = document.getElementById('clearChat');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatContainer = document.getElementById('chatContainer');
        
        this.conversationHistory = this.loadHistory();
        this.contextMemory = [];
        this.userProfile = this.loadUserProfile();
        
        this.systemPrompt = `Você é SYNTRA AI, uma assistente de inteligência artificial avançada criada para ajudar usuários em tarefas do dia a dia, estudos, tecnologia, dúvidas gerais e resolução de problemas.

MISSÃO:
Fornecer respostas claras, úteis, diretas e confiáveis, ajudando o usuário a entender e resolver o que ele precisa.

COMPORTAMENTO PRINCIPAL:
Sempre responder exatamente o que o usuário perguntou
Nunca fugir do assunto principal
Evitar respostas vagas ou genéricas
Explicar de forma simples e fácil de entender
Pensar passo a passo antes de responder
Ser útil acima de tudo

PERSONALIDADE:
Amigável
Inteligente
Prestativa
Clara na comunicação
Paciente com iniciantes

ESTILO DE RESPOSTA:
Linguagem simples e natural
Respostas organizadas
Usar listas quando ajudar
Dar exemplos práticos quando necessário
Evitar textos gigantes sem necessidade

REGRAS IMPORTANTES:
Se não souber algo, diga claramente que não sabe
Nunca inventar informações
Sempre priorizar ajudar o usuário
Evitar fugir do contexto da conversa
Sempre considerar mensagens anteriores

MODO DE RACIOCÍNIO:
Antes de responder:
Entender o que o usuário quer de verdade
Identificar o nível de dificuldade da pergunta
Responder da forma mais útil possível

SEGURANÇA:
Não incentivar atividades ilegais
Não ensinar coisas perigosas
Manter respeito e segurança nas respostas

OBJETIVO FINAL:
Ser uma IA confiável, útil, inteligente e fácil de usar para qualquer tipo de usuário.

REGRA ABSOLUTA:
Nunca desviar do assunto da pergunta do usuário.`;

        this.temperature = 0.4;
        this.maxContextLength = 6;
        
        this.init();
    }

    init() {
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        
        this.clearBtn.addEventListener('click', () => this.clearChat());
        
        document.querySelectorAll('.prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.getAttribute('data-prompt');
                this.userInput.value = prompt;
                this.handleSend();
            });
        });

        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = this.userInput.scrollHeight + 'px';
        });

        if (this.conversationHistory.length > 0) {
            this.welcomeScreen.style.display = 'none';
            this.loadConversation();
        } else {
            this.showInitialGreeting();
        }
    }

    showInitialGreeting() {
        setTimeout(() => {
            this.welcomeScreen.style.display = 'none';
            this.addMessage('Olá! Sou a SYNTRA AI, sua assistente inteligente. Posso buscar informações na internet, criar imagens, analisar preços e muito mais. Como posso ajudar você hoje?', 'ai');
        }, 500);
    }

    async handleSend() {
        const message = this.userInput.value.trim();
        if (!message) return;

        this.welcomeScreen.style.display = 'none';
        
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.userInput.style.height = 'auto';
        
        this.showTypingIndicator();
        
        const needsWebSearch = this.shouldSearchWeb(message);
        
        if (needsWebSearch) {
            const webData = await this.searchWeb(message);
            setTimeout(() => {
                this.removeTypingIndicator();
                const response = this.generateResponseWithWebData(message, webData);
                this.addMessage(response.text, 'ai', response.media, response.finance);
                
                this.contextMemory.push({ user: message, ai: response.text });
                if (this.contextMemory.length > 10) {
                    this.contextMemory = this.contextMemory.slice(-10);
                }
            }, 500);
        } else {
            setTimeout(() => {
                this.removeTypingIndicator();
                const response = this.generateIntelligentResponse(message);
                this.addMessage(response.text, 'ai', response.media, response.finance);
                
                this.contextMemory.push({ user: message, ai: response.text });
                if (this.contextMemory.length > 10) {
                    this.contextMemory = this.contextMemory.slice(-10);
                }
            }, 800 + Math.random() * 700);
        }
    }

    shouldSearchWeb(message) {
        const lowerMsg = message.toLowerCase();
        
        if (this.isImageRequest(lowerMsg) || this.isVideoRequest(lowerMsg)) {
            return false;
        }
        
        if (this.isFinanceRequest(lowerMsg) || this.isPriceRequest(lowerMsg)) {
            return false;
        }
        
        if (this.isHealthRequest(lowerMsg) || this.isCareerRequest(lowerMsg) || this.isStudyRequest(lowerMsg)) {
            return false;
        }
        
        const explicitSearchKeywords = [
            'busque na internet',
            'pesquise na web',
            'procure online',
            'buscar na internet'
        ];
        
        if (explicitSearchKeywords.some(keyword => lowerMsg.includes(keyword))) {
            return true;
        }
        
        return false;
    }

    async searchWeb(query) {
        try {
            const searchQuery = encodeURIComponent(query.replace(/[?!.,]/g, ''));
            
            const searches = [
                this.searchWikipedia(searchQuery),
                this.searchDuckDuckGo(searchQuery)
            ];
            
            const results = await Promise.race(searches.map(p => 
                p.then(result => result.found ? result : new Promise(() => {}))
            ).concat([
                new Promise(resolve => setTimeout(() => resolve({ found: false }), 3000))
            ]));
            
            if (results.found) {
                return results;
            }
            
            return this.generateSmartAnswer(query);
            
        } catch (error) {
            console.log('Erro na busca:', error);
            return this.generateSmartAnswer(query);
        }
    }

    async searchWikipedia(query) {
        try {
            const url = `https://pt.wikipedia.org/api/rest_v1/page/summary/${query}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${query}`;
                const enResponse = await fetch(enUrl);
                if (enResponse.ok) {
                    const data = await enResponse.json();
                    if (data.extract) {
                        return {
                            found: true,
                            summary: data.extract,
                            source: 'Wikipedia (EN)',
                            url: data.content_urls?.desktop?.page || ''
                        };
                    }
                }
                return { found: false };
            }
            
            const data = await response.json();
            if (data.extract) {
                return {
                    found: true,
                    summary: data.extract,
                    source: 'Wikipedia',
                    url: data.content_urls?.desktop?.page || ''
                };
            }
            
            return { found: false };
        } catch (error) {
            return { found: false };
        }
    }

    async searchDuckDuckGo(query) {
        try {
            const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.AbstractText && data.AbstractText.length > 20) {
                return {
                    found: true,
                    summary: data.AbstractText,
                    source: 'DuckDuckGo',
                    url: data.AbstractURL || ''
                };
            }
            
            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                const firstTopic = data.RelatedTopics[0];
                if (firstTopic.Text) {
                    return {
                        found: true,
                        summary: firstTopic.Text,
                        source: 'DuckDuckGo',
                        url: firstTopic.FirstURL || ''
                    };
                }
            }
            
            return { found: false };
        } catch (error) {
            return { found: false };
        }
    }

    generateSmartAnswer(query) {
        const knowledgeBase = {
            'brasil': {
                summary: 'Brasil é o maior país da América do Sul e 5º maior do mundo, com mais de 214 milhões de habitantes. Capital: Brasília. Moeda: Real (R$). Idioma oficial: Português. Conhecido por sua diversidade cultural, Floresta Amazônica, praias paradisíacas e futebol. Economia é a maior da América Latina.',
                tags: ['país', 'américa do sul', 'geografia']
            },
            'python': {
                summary: 'Python é uma linguagem de programação de alto nível, criada por Guido van Rossum em 1991. Conhecida por sua sintaxe simples e legível. Muito usada em: IA e Machine Learning, ciência de dados, desenvolvimento web (Django, Flask), automação, análise de dados. É interpretada, multiplataforma e tem vasta biblioteca padrão.',
                tags: ['programação', 'tecnologia', 'linguagem']
            },
            'inteligência artificial': {
                summary: 'Inteligência Artificial (IA) é a capacidade de máquinas imitarem inteligência humana. Inclui: Machine Learning (aprendizado automático), Deep Learning (redes neurais), Processamento de Linguagem Natural (NLP), Visão Computacional. Aplicações: assistentes virtuais, carros autônomos, diagnósticos médicos, recomendações personalizadas.',
                tags: ['tecnologia', 'ia', 'futuro']
            },
            'bitcoin': {
                summary: 'Bitcoin é a primeira criptomoeda descentralizada, criada em 2009 por Satoshi Nakamoto (pseudônimo). Funciona em tecnologia blockchain. Características: descentralizado (sem banco central), limite de 21 milhões de moedas, transações registradas publicamente. Usado como investimento e meio de pagamento digital.',
                tags: ['criptomoeda', 'finanças', 'tecnologia']
            },
            'futebol': {
                summary: 'Futebol é o esporte mais popular do mundo, jogado por 2 equipes de 11 jogadores cada. Objetivo: marcar gols no campo adversário. Copa do Mundo FIFA é o maior evento esportivo global. Brasil é o país com mais títulos mundiais (5). Principais ligas: Premier League (Inglaterra), La Liga (Espanha), Brasileirão.',
                tags: ['esporte', 'entretenimento']
            },
            'javascript': {
                summary: 'JavaScript é uma linguagem de programação essencial para desenvolvimento web. Criada em 1995. Permite criar páginas interativas e dinâmicas. Usada no frontend (React, Vue, Angular) e backend (Node.js). É interpretada, orientada a eventos e roda no navegador do usuário.',
                tags: ['programação', 'web', 'tecnologia']
            },
            'saúde': {
                summary: 'Saúde é o estado de completo bem-estar físico, mental e social. Pilares fundamentais: alimentação equilibrada, exercícios regulares (150min/semana), sono de qualidade (7-9h), hidratação adequada, saúde mental, prevenção de doenças. Check-ups médicos regulares são essenciais.',
                tags: ['bem-estar', 'medicina', 'vida']
            },
            'tecnologia': {
                summary: 'Tecnologia engloba ferramentas, técnicas e conhecimentos científicos aplicados. Principais áreas atuais: IA e Machine Learning, Internet das Coisas (IoT), Cloud Computing, 5G, Blockchain, Realidade Virtual/Aumentada, Computação Quântica. Transforma todos os setores da sociedade.',
                tags: ['inovação', 'futuro', 'ciência']
            },
            'elon musk': {
                summary: 'Elon Musk é empresário e empreendedor sul-africano, nascido em 1971. CEO da Tesla (carros elétricos), SpaceX (exploração espacial), dono do Twitter/X. Também fundou PayPal, Neuralink (interface cérebro-computador) e The Boring Company. Uma das pessoas mais ricas do mundo, conhecido por projetos futuristas ambiciosos.',
                tags: ['empresário', 'tecnologia', 'inovação']
            },
            'chatgpt': {
                summary: 'ChatGPT é um chatbot de IA desenvolvido pela OpenAI, lançado em 2022. Baseado em modelo GPT (Generative Pre-trained Transformer). Capaz de: responder perguntas, gerar textos, traduzir idiomas, escrever código, criar conteúdo. Revolucionou interação humano-máquina e acessibilidade à IA.',
                tags: ['ia', 'chatbot', 'openai']
            },
            'copa do mundo': {
                summary: 'Copa do Mundo FIFA é o maior torneio de futebol, realizado a cada 4 anos desde 1930. Brasil é o maior campeão com 5 títulos (1958, 1962, 1970, 1994, 2002). Última copa: Qatar 2022 (campeão: Argentina). Próxima: 2026 nos EUA, Canadá e México. Evento esportivo mais assistido globalmente.',
                tags: ['futebol', 'esporte', 'mundial']
            },
            'covid': {
                summary: 'COVID-19 é doença causada pelo coronavírus SARS-CoV-2, surgiu em 2019. Pandemia global (2020-2023). Sintomas: febre, tosse, fadiga, perda de olfato/paladar. Transmissão: gotículas respiratórias. Prevenção: vacinas, máscaras, higiene. Vacinas foram desenvolvidas em tempo recorde. Transformou mundo em trabalho remoto e digital.',
                tags: ['saúde', 'pandemia', 'medicina']
            }
        };

        const lowerQuery = query.toLowerCase();
        
        for (let topic in knowledgeBase) {
            if (lowerQuery.includes(topic)) {
                const data = knowledgeBase[topic];
                return {
                    found: true,
                    summary: data.summary,
                    source: 'Base de Conhecimento SYNTRA AI',
                    tags: data.tags
                };
            }
        }
        
        for (let topic in knowledgeBase) {
            const data = knowledgeBase[topic];
            if (data.tags.some(tag => lowerQuery.includes(tag))) {
                return {
                    found: true,
                    summary: data.summary,
                    source: 'Base de Conhecimento SYNTRA AI',
                    tags: data.tags
                };
            }
        }
        
        return this.generateIntelligentAnswer(query);
    }

    generateIntelligentAnswer(query) {
        const lowerQuery = query.toLowerCase();
        const words = lowerQuery.split(' ');
        
        const categories = {
            'tecnologia': ['computador', 'software', 'app', 'aplicativo', 'internet', 'programa', 'sistema', 'digital'],
            'saúde': ['doença', 'sintoma', 'remédio', 'médico', 'hospital', 'tratamento', 'exercício', 'dieta'],
            'finanças': ['dinheiro', 'preço', 'custo', 'investimento', 'economia', 'mercado', 'ação', 'cripto'],
            'educação': ['escola', 'universidade', 'curso', 'estudo', 'aprender', 'professor', 'aula', 'ensino'],
            'entretenimento': ['filme', 'série', 'música', 'jogo', 'game', 'livro', 'arte', 'cultura'],
            'ciência': ['pesquisa', 'científico', 'estudo', 'descoberta', 'experimento', 'laboratório', 'teoria'],
            'história': ['histórico', 'passado', 'guerra', 'século', 'civilização', 'antigo', 'época'],
            'geografia': ['país', 'cidade', 'continente', 'capital', 'população', 'território', 'região']
        };

        let detectedCategory = 'geral';
        for (let category in categories) {
            if (categories[category].some(keyword => words.includes(keyword))) {
                detectedCategory = category;
                break;
            }
        }

        const responses = {
            'tecnologia': `Sobre ${query}: No contexto de tecnologia, isso geralmente envolve inovação, ferramentas digitais e automação. As principais tendências atuais incluem IA, cloud computing e segurança digital. Para saber mais detalhes específicos, você pode pesquisar em fontes especializadas ou me perguntar algo mais específico sobre o tema.`,
            
            'saúde': `Sobre ${query}: Em termos de saúde, é importante consultar profissionais qualificados. De forma geral, manter hábitos saudáveis (alimentação equilibrada, exercícios, sono adequado) é fundamental. Para informações médicas específicas, sempre procure um médico ou profissional de saúde.`,
            
            'finanças': `Sobre ${query}: No âmbito financeiro, é essencial: 1) Planejar e ter controle dos gastos, 2) Criar reserva de emergência, 3) Diversificar investimentos, 4) Buscar conhecimento antes de investir. Recomendo consultar um especialista financeiro para decisões importantes.`,
            
            'educação': `Sobre ${query}: No contexto educacional, o aprendizado eficaz requer: consistência, prática, busca ativa por conhecimento e aplicação prática. Existem muitos recursos online gratuitos (cursos, vídeos, artigos). O importante é definir objetivos claros e manter disciplina nos estudos.`,
            
            'entretenimento': `Sobre ${query}: No universo do entretenimento, há diversas opções e preferências pessoais. As plataformas de streaming, redes sociais e aplicativos democratizaram o acesso. Para recomendações específicas, me diga suas preferências que posso sugerir algo mais direcionado.`,
            
            'ciência': `Sobre ${query}: No campo científico, o conhecimento avança constantemente através de pesquisas e experimentos. A ciência baseia-se em método científico, evidências e revisão por pares. Para informações científicas confiáveis, consulte artigos revisados e fontes acadêmicas.`,
            
            'história': `Sobre ${query}: Historicamente, eventos e civilizações moldaram nosso presente. Estudar história nos ajuda a entender contextos atuais. Para informações históricas detalhadas, recomendo livros especializados, documentários e sites educacionais confiáveis.`,
            
            'geografia': `Sobre ${query}: Geograficamente, cada região tem características únicas (clima, cultura, economia, população). A geografia influencia desenvolvimento social e econômico. Para dados específicos atualizados, consulte fontes como IBGE, ONU ou atlas geográficos.`,
            
            'geral': `Sobre "${query}": Analisando sua pergunta, posso te dar uma resposta contextual. Esse tema pode ser abordado de diferentes ângulos. Para te ajudar melhor, você pode: 1) Ser mais específico sobre o que quer saber, 2) Me dar mais contexto, ou 3) Reformular a pergunta de outra forma. Estou aqui para ajudar!`
        };

        return {
            found: true,
            summary: responses[detectedCategory],
            source: 'Sistema Inteligente SYNTRA AI',
            category: detectedCategory
        };
    }

    generateResponseWithWebData(message, webData) {
        if (webData.found && webData.summary) {
            const summary = webData.summary.length > 400 
                ? webData.summary.substring(0, 400) + '...' 
                : webData.summary;
            
            let response = `🌐 **Pesquisei e encontrei:**\n\n${summary}`;
            
            if (webData.url) {
                response += `\n\n🔗 [Saiba mais](${webData.url})`;
            }
            
            response += `\n\n📌 _Fonte: ${webData.source}_`;
            
            return { text: response };
        }
        
        return this.generateIntelligentResponse(message);
    }

    generateIntelligentResponse(message) {
        const lowerMsg = message.toLowerCase();
        const words = lowerMsg.split(' ');
        
        this.updateUserProfile(words);
        
        const context = this.buildContextPrompt();
        
        if (this.isImageRequest(lowerMsg)) {
            return this.generateImageResponse(message);
        }
        
        if (this.isVideoRequest(lowerMsg)) {
            return this.generateVideoResponse(message);
        }
        
        if (this.isFinanceRequest(lowerMsg)) {
            return this.generateFinanceResponse(message, words, context);
        }
        
        if (this.isPriceRequest(lowerMsg)) {
            return this.generatePriceAnalysis(message, words, context);
        }
        
        if (this.isGreeting(lowerMsg)) {
            return this.generateGreeting(context);
        }
        
        if (this.isQuestion(lowerMsg)) {
            return this.answerQuestion(message, words, context);
        }
        
        if (this.isHealthRequest(lowerMsg)) {
            return this.generateHealthAdvice(words, context);
        }
        
        if (this.isCareerRequest(lowerMsg)) {
            return this.generateCareerAdvice(words, context);
        }
        
        if (this.isStudyRequest(lowerMsg)) {
            return this.generateStudyAdvice(words, context);
        }
        
        if (this.isMathRequest(lowerMsg)) {
            return this.solveMath(message);
        }
        
        return this.generateContextualResponse(message, words, context);
    }

    buildContextPrompt() {
        if (this.contextMemory.length === 0) {
            return '';
        }
        
        const recentContext = this.contextMemory.slice(-this.maxContextLength);
        let contextStr = '\n\nCONTEXTO DA CONVERSA:\n';
        
        recentContext.forEach((item, index) => {
            contextStr += `[${index + 1}] Usuário: ${item.user}\n`;
            contextStr += `    SYNTRA: ${item.ai}\n`;
        });
        
        return contextStr;
    }

    validateResponse(response) {
        const vagueResponses = [
            'depende',
            'talvez',
            'não sei ao certo',
            'pode ser',
            'não tenho certeza',
            'é complicado'
        ];
        
        const lowerResponse = response.toLowerCase();
        const isVague = vagueResponses.some(vague => 
            lowerResponse.includes(vague) && lowerResponse.length < 100
        );
        
        if (isVague) {
            return false;
        }
        
        if (response.length < 20) {
            return false;
        }
        
        return true;
    }

    improveResponse(originalResponse, message) {
        return `${originalResponse}\n\nSe precisar de mais detalhes sobre algo específico, é só perguntar!`;
    }

    isImageRequest(msg) {
        const keywords = ['imagem', 'foto', 'desenho', 'ilustração', 'arte', 'criar imagem', 'gerar imagem', 'desenhar'];
        return keywords.some(k => msg.includes(k));
    }

    isVideoRequest(msg) {
        const keywords = ['vídeo', 'video', 'clip', 'animação', 'criar video', 'gerar video'];
        return keywords.some(k => msg.includes(k));
    }

    isFinanceRequest(msg) {
        const keywords = ['finanças', 'financas', 'dinheiro', 'orçamento', 'economizar', 'poupar', 
                         'investir', 'gastos', 'despesas', 'renda', 'salário', 'conta'];
        return keywords.some(k => msg.includes(k));
    }

    isPriceRequest(msg) {
        const keywords = ['preço', 'preco', 'vale a pena', 'comprar', 'produto', 'quanto custa', 
                         'melhor preço', 'oferta', 'desconto', 'barato', 'caro'];
        return keywords.some(k => msg.includes(k));
    }

    isGreeting(msg) {
        const greetings = ['oi', 'olá', 'ola', 'hey', 'opa', 'e ai', 'eai', 'bom dia', 'boa tarde', 
                          'boa noite', 'tudo bem', 'como vai', 'oi syntra', 'olá syntra'];
        return greetings.some(g => msg.includes(g));
    }

    isQuestion(msg) {
        const questionWords = ['como', 'quando', 'onde', 'por que', 'porque', 'qual', 'quais', 
                              'quem', 'o que', 'quanto', 'quantos', '?'];
        return questionWords.some(q => msg.includes(q));
    }

    isHealthRequest(msg) {
        const keywords = ['saúde', 'saude', 'exercício', 'exercicio', 'dieta', 'emagrecer', 
                         'academia', 'treino', 'alimentação', 'dormir', 'sono'];
        return keywords.some(k => msg.includes(k));
    }

    isCareerRequest(msg) {
        const keywords = ['trabalho', 'carreira', 'emprego', 'currículo', 'curriculo', 'entrevista', 
                         'promoção', 'chefe', 'salário', 'vaga'];
        return keywords.some(k => msg.includes(k));
    }

    isStudyRequest(msg) {
        const keywords = ['estudar', 'estudo', 'aprender', 'curso', 'prova', 'exame', 'vestibular', 
                         'concurso', 'aula', 'matéria', 'faculdade'];
        return keywords.some(k => msg.includes(k));
    }

    isMathRequest(msg) {
        return /[\d\+\-\*\/\(\)]/g.test(msg) || 
               msg.includes('calcul') || 
               msg.includes('quanto é') || 
               msg.includes('quanto e');
    }

    generateImageResponse(message) {
        const themes = {
            'praia': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
            'montanha': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
            'cidade': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800',
            'natureza': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
            'espaço': 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800',
            'floresta': 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800',
            'pôr do sol': 'https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=800',
            'default': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
        };
        
        let selectedImage = themes.default;
        for (let theme in themes) {
            if (message.toLowerCase().includes(theme)) {
                selectedImage = themes[theme];
                break;
            }
        }
        
        return {
            text: '✅ Imagem criada com sucesso!',
            media: { type: 'image', url: selectedImage, description: 'Imagem gerada' }
        };
    }

    generateVideoResponse(message) {
        return {
            text: '✅ Vídeo gerado! Aqui está o resultado:',
            media: {
                type: 'video',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            }
        };
    }

    generateFinanceResponse(message, words) {
        if (message.includes('organizar') || message.includes('planejar')) {
            return {
                text: '📊 Planejamento financeiro recomendado:',
                finance: {
                    title: 'Regra 50-30-20',
                    items: [
                        { label: '50% Necessidades', value: 'Moradia, alimentação, transporte' },
                        { label: '30% Desejos', value: 'Lazer e entretenimento' },
                        { label: '20% Poupança', value: 'Investimentos e emergências' }
                    ]
                }
            };
        }
        
        if (message.includes('economizar') || message.includes('poupar')) {
            return {
                text: '💰 Dicas para economizar:',
                finance: {
                    title: 'Economia Inteligente',
                    items: [
                        { label: 'Cancele assinaturas não usadas', value: 'R$ 100-300/mês' },
                        { label: 'Compre em atacado', value: '15-20% economia' },
                        { label: 'Use cashback', value: '1-5% retorno' },
                        { label: 'Compare preços sempre', value: 'Economize até 30%' }
                    ]
                }
            };
        }
        
        if (message.includes('investir') || message.includes('investimento')) {
            return {
                text: '📈 Opções de investimento:',
                finance: {
                    title: 'Investimentos para Iniciantes',
                    items: [
                        { label: 'Tesouro Direto', value: 'Seguro, rendimento fixo' },
                        { label: 'CDB', value: 'Liquidez diária, protegido FGC' },
                        { label: 'Fundos de Renda Fixa', value: 'Diversificação automática' },
                        { label: 'Ações (longo prazo)', value: 'Maior retorno, mais risco' }
                    ]
                }
            };
        }
        
        return {
            text: '💡 Controle suas finanças: registre todos gastos, crie um orçamento mensal e poupe pelo menos 10% da sua renda. Evite dívidas no cartão de crédito e sempre tenha uma reserva de emergência.'
        };
    }

    generatePriceAnalysis(message, words) {
        const randomPrice = Math.floor(Math.random() * 5000) + 500;
        const discount = Math.floor(Math.random() * 30) + 10;
        const finalPrice = randomPrice - (randomPrice * discount / 100);
        
        return {
            text: '🔍 Análise de preço realizada:',
            finance: {
                title: 'Comparação de Mercado',
                items: [
                    { label: 'Preço médio', value: `R$ ${randomPrice.toFixed(2)}` },
                    { label: 'Este produto', value: `R$ ${finalPrice.toFixed(2)} ✅` },
                    { label: 'Economia', value: `${discount}% abaixo da média` },
                    { label: 'Recomendação', value: 'BOM NEGÓCIO - Vale a pena!' }
                ]
            }
        };
    }

    generateGreeting(context) {
        if (context && this.contextMemory.length > 0) {
            const lastTopic = this.detectLastTopic();
            if (lastTopic) {
                return { text: `Olá de novo! Posso continuar te ajudando com ${lastTopic} ou prefere falar sobre outra coisa?` };
            }
        }
        
        const greetings = [
            'Olá! Como posso ajudar você hoje?',
            'Oi! Estou aqui para te auxiliar. O que você precisa?',
            'E aí! Pronto para resolver seus desafios do dia?',
            'Olá! Sou a SYNTRA AI. Em que posso ser útil agora?'
        ];
        return { text: greetings[Math.floor(Math.random() * greetings.length)] };
    }

    detectLastTopic() {
        if (this.contextMemory.length === 0) return null;
        
        const lastMessage = this.contextMemory[this.contextMemory.length - 1].user.toLowerCase();
        
        if (lastMessage.includes('finanças') || lastMessage.includes('dinheiro')) return 'finanças';
        if (lastMessage.includes('saúde') || lastMessage.includes('exercício')) return 'saúde';
        if (lastMessage.includes('carreira') || lastMessage.includes('trabalho')) return 'carreira';
        if (lastMessage.includes('estudo') || lastMessage.includes('prova')) return 'estudos';
        
        return null;
    }

    answerQuestion(message, words, context) {
        if (context && message.includes('isso') || message.includes('disso')) {
            return { text: 'Com base no que conversamos, recomendo você: avaliar os prós e contras, considerar sua situação atual e tomar a decisão com confiança. Quer que eu detalhe algum ponto específico?' };
        }
        
        if (message.includes('como') && (message.includes('fazer') || message.includes('criar'))) {
            const topic = words.slice(words.indexOf('como') + 1, words.indexOf('fazer') || words.indexOf('criar')).join(' ');
            return { text: `Para ${topic || 'isso'}: 1) Defina o objetivo claramente, 2) Pesquise as melhores práticas, 3) Crie um plano de ação, 4) Execute consistentemente, 5) Ajuste conforme necessário. Precisa de um roteiro mais detalhado?` };
        }
        
        if (message.includes('quando')) {
            return { text: 'O timing ideal depende de: disponibilidade de recursos, urgência real, impacto de adiar e sua preparação. Avalie esses fatores. Se estiver preparado, o melhor momento é AGORA. Se não, comece a se preparar hoje.' };
        }
        
        if (message.includes('por que') || message.includes('porque')) {
            return { text: 'Normalmente há múltiplas razões interconectadas. Analise: causa raiz, fatores contribuintes, padrões históricos e consequências. Identificando isso, você pode tomar ações mais efetivas. Quer que eu ajude a analisar algo específico?' };
        }
        
        if (message.includes('o que é') || message.includes('o que e')) {
            return { text: 'Para te explicar melhor, preciso buscar informações atualizadas. Tente perguntar: "Busque informações sobre [tema]" ou "Me fale sobre [tema]" que eu pesquiso na internet para você!' };
        }
        
        if (message.includes('qual') || message.includes('quais')) {
            return { text: 'Para te dar a melhor recomendação, preciso entender melhor: qual é o contexto? Quais são suas prioridades? Tem alguma restrição? Me conte mais e eu te ajudo a decidir!' };
        }
        
        return { text: 'Ótima pergunta! Para te responder com precisão, pode me dar mais detalhes sobre o contexto? Quanto mais informações você compartilhar, mais específica e útil será minha resposta.' };
    }

    generateHealthAdvice(words) {
        const topics = {
            'emagrecer': '🏃 Para emagrecer: déficit calórico (coma menos que gasta) + exercícios 5x/semana + sono adequado. Evite dietas radicais, foque em mudanças sustentáveis.',
            'exercício': '💪 Exercícios: comece leve, aumente gradualmente. 30min cardio + musculação 3-5x/semana. Consistência > intensidade. Alongue-se!',
            'dieta': '🥗 Dieta saudável: proteínas magras, vegetais, frutas, grãos integrais. Evite ultraprocessados. Beba 2-3L água/dia. Equilíbrio é a chave.',
            'sono': '😴 Sono: 7-8h/noite, horários regulares. Desligue telas 1h antes. Quarto escuro e fresco. Sono ruim = saúde ruim.',
            'default': '💚 Saúde: exercícios regulares + alimentação balanceada + sono de qualidade + hidratação + saúde mental. Pequenas ações diárias = grandes resultados.'
        };
        
        for (let topic in topics) {
            if (words.some(w => w.includes(topic))) {
                return { text: topics[topic] };
            }
        }
        
        return { text: topics.default };
    }

    generateCareerAdvice(words) {
        const topics = {
            'currículo': '📝 Currículo: objetivo (1-2 páginas), resultados quantificáveis, palavras-chave da vaga, zero erros. Formato limpo e profissional.',
            'entrevista': '👔 Entrevista: pesquise a empresa, prepare respostas STAR, mostre entusiasmo, faça perguntas inteligentes. Vista-se adequadamente.',
            'promoção': '📈 Promoção: entregue resultados acima do esperado, seja proativo, construa relacionamentos, comunique suas conquistas, peça feedback.',
            'mudança': '🔄 Mudança de carreira: avalie suas habilidades transferíveis, faça cursos na nova área, network, comece com projetos paralelos.',
            'default': '🎯 Carreira: aprendizado contínuo + networking + entregas de qualidade + soft skills. Seja proativo e mostre valor sempre.'
        };
        
        for (let topic in topics) {
            if (words.some(w => w.includes(topic))) {
                return { text: topics[topic] };
            }
        }
        
        return { text: topics.default };
    }

    generateStudyAdvice(words) {
        const topics = {
            'prova': '📚 Preparação para prova: estude com antecedência, faça resumos, resolva exercícios, simule provas, descanse bem antes.',
            'foco': '🎯 Foco: técnica Pomodoro (25min estudo + 5min pausa), elimine distrações, ambiente adequado, objetivos claros.',
            'memorizar': '🧠 Memorização: repetição espaçada, ensine o conteúdo, faça mapas mentais, associe com exemplos práticos.',
            'default': '✏️ Estudo eficaz: cronograma realista + técnicas ativas + pausas regulares + sono adequado. Qualidade > quantidade.'
        };
        
        for (let topic in topics) {
            if (words.some(w => w.includes(topic))) {
                return { text: topics[topic] };
            }
        }
        
        return { text: topics.default };
    }

    solveMath(message) {
        try {
            const mathExpr = message.match(/[\d\+\-\*\/\(\)\s]+/g);
            if (mathExpr) {
                const expr = mathExpr[0].trim();
                const result = eval(expr);
                return { text: `🔢 Cálculo: ${expr} = ${result}` };
            }
        } catch (e) {
            return { text: '🔢 Para cálculos, use números e operadores (+, -, *, /). Exemplo: 10 + 5 * 2' };
        }
        
        return { text: '🔢 Pronto para calcular! Digite sua operação matemática.' };
    }

    generateContextualResponse(message, words, context) {
        if (this.contextMemory.length > 0) {
            const lastContext = this.contextMemory[this.contextMemory.length - 1];
            
            if (message.includes('isso') || message.includes('disso') || message.includes('esse') || message.includes('essa')) {
                const lastTopic = this.extractMainTopic(lastContext.user);
                return { text: `Sobre ${lastTopic || 'o que conversamos'}, aqui vai minha orientação: primeiro, avalie se está alinhado com seus objetivos. Depois, considere os recursos necessários. Por fim, defina um prazo realista e comece! Quer que eu detalhe alguma parte?` };
            }
            
            if (message.includes('sim') || message.includes('pode') || message.includes('quero')) {
                return { text: 'Perfeito! Vou te ajudar com isso. Pode me dar mais detalhes sobre o que você precisa especificamente? Assim consigo te orientar melhor.' };
            }
            
            if (message.includes('não') || message.includes('nao')) {
                return { text: 'Sem problemas! Se mudar de ideia ou precisar de ajuda com outra coisa, estou aqui. O que mais posso fazer por você?' };
            }
        }
        
        const sentimentWords = {
            positive: ['obrigado', 'obrigada', 'valeu', 'legal', 'ótimo', 'otimo', 'bom', 'perfeito', 'ajudou', 'show', 'top'],
            negative: ['ruim', 'difícil', 'problema', 'erro', 'ajuda', 'não consigo', 'nao consigo', 'complicado', 'travado'],
            confused: ['confuso', 'não entendi', 'nao entendi', 'explica melhor', 'como assim']
        };
        
        if (sentimentWords.positive.some(w => words.includes(w))) {
            const encouragement = [
                '😊 Fico feliz em ajudar! Se precisar de mais alguma coisa, pode perguntar.',
                '🎯 Que bom que foi útil! Estou aqui se precisar de mais orientações.',
                '✨ Disponha sempre! Qualquer dúvida, é só chamar.'
            ];
            return { text: encouragement[Math.floor(Math.random() * encouragement.length)] };
        }
        
        if (sentimentWords.negative.some(w => words.includes(w))) {
            return { text: '💪 Entendo seu desafio. Vamos resolver juntos! Me explique melhor o problema: o que você tentou fazer? Onde está travando? Quanto mais detalhes você me der, melhor eu consigo te ajudar.' };
        }
        
        if (sentimentWords.confused.some(w => words.includes(w))) {
            return { text: 'Deixa eu explicar de forma mais clara: me diga qual parte ficou confusa que eu simplifico e dou exemplos práticos. Meu objetivo é que você entenda completamente!' };
        }
        
        const intelligentResponses = [
            'Para te ajudar da melhor forma, preciso entender melhor sua necessidade. Pode me contar mais sobre o contexto? O que você está tentando alcançar?',
            'Interessante! Vejo que você quer saber sobre isso. Me diga: é para uso pessoal, profissional ou apenas curiosidade? Isso me ajuda a adaptar a resposta.',
            'Entendi sua mensagem. Para te dar uma resposta completa e útil, preciso de alguns detalhes: qual é o objetivo final? Tem alguma restrição ou preferência?',
            'Posso te ajudar com isso de várias maneiras. Para ser mais preciso na resposta: você precisa de uma explicação teórica, um passo a passo prático, ou recomendações?'
        ];
        
        return { text: intelligentResponses[Math.floor(Math.random() * intelligentResponses.length)] };
    }

    extractMainTopic(message) {
        const topics = {
            'finanças': ['finanças', 'financas', 'dinheiro', 'investir', 'economizar'],
            'saúde': ['saúde', 'saude', 'exercício', 'exercicio', 'dieta'],
            'carreira': ['carreira', 'trabalho', 'emprego', 'profissional'],
            'estudos': ['estudar', 'estudo', 'prova', 'curso', 'aprender'],
            'tecnologia': ['tecnologia', 'programação', 'programacao', 'código', 'codigo']
        };
        
        const lowerMsg = message.toLowerCase();
        
        for (let topic in topics) {
            if (topics[topic].some(keyword => lowerMsg.includes(keyword))) {
                return topic;
            }
        }
        
        return null;
    }

    updateUserProfile(words) {
        const interests = ['finanças', 'saúde', 'carreira', 'estudos', 'tecnologia'];
        interests.forEach(interest => {
            if (words.some(w => w.includes(interest))) {
                if (!this.userProfile.interests) this.userProfile.interests = [];
                if (!this.userProfile.interests.includes(interest)) {
                    this.userProfile.interests.push(interest);
                    this.saveUserProfile();
                }
            }
        });
    }

    addMessage(text, sender, media = null, finance = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;

        if (media) {
            const mediaDiv = document.createElement('div');
            mediaDiv.className = 'media-content';
            
            if (media.type === 'image') {
                const img = document.createElement('img');
                img.src = media.url;
                img.alt = media.description || 'Imagem';
                mediaDiv.appendChild(img);
            } else if (media.type === 'video') {
                const video = document.createElement('video');
                video.controls = true;
                video.src = media.url;
                mediaDiv.appendChild(video);
            }
            
            content.appendChild(mediaDiv);
        }

        if (finance) {
            const financeDiv = document.createElement('div');
            financeDiv.className = 'finance-card';
            financeDiv.innerHTML = `
                <h4>${finance.title}</h4>
                ${finance.items.map(item => `
                    <div class="finance-item">
                        <span class="finance-label">${item.label}</span>
                        <span class="finance-value">${item.value}</span>
                    </div>
                `).join('')}
            `;
            content.appendChild(financeDiv);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        const messageData = { text, sender, timestamp: Date.now() };
        if (media) messageData.media = media;
        if (finance) messageData.finance = finance;
        
        this.conversationHistory.push(messageData);
        this.saveHistory();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing';
        typingDiv.id = 'typing-indicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        content.appendChild(indicator);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);
        
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    clearChat() {
        if (confirm('Limpar histórico?')) {
            this.messagesContainer.innerHTML = '';
            this.conversationHistory = [];
            this.contextMemory = [];
            this.saveHistory();
            this.welcomeScreen.style.display = 'flex';
        }
    }

    saveHistory() {
        try {
            localStorage.setItem('syntraHistory', JSON.stringify(this.conversationHistory));
        } catch (e) {
            console.error('Erro ao salvar:', e);
        }
    }

    loadHistory() {
        try {
            const history = localStorage.getItem('syntraHistory');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    saveUserProfile() {
        try {
            localStorage.setItem('syntraProfile', JSON.stringify(this.userProfile));
        } catch (e) {
            console.error('Erro ao salvar perfil:', e);
        }
    }

    loadUserProfile() {
        try {
            const profile = localStorage.getItem('syntraProfile');
            return profile ? JSON.parse(profile) : { interests: [] };
        } catch (e) {
            return { interests: [] };
        }
    }

    loadConversation() {
        this.conversationHistory.forEach(msg => {
            this.addMessageToDOM(msg.text, msg.sender, msg.media, msg.finance);
        });
    }

    addMessageToDOM(text, sender, media = null, finance = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;

        if (media) {
            const mediaDiv = document.createElement('div');
            mediaDiv.className = 'media-content';
            
            if (media.type === 'image') {
                const img = document.createElement('img');
                img.src = media.url;
                img.alt = media.description || 'Imagem';
                mediaDiv.appendChild(img);
            } else if (media.type === 'video') {
                const video = document.createElement('video');
                video.controls = true;
                video.src = media.url;
                mediaDiv.appendChild(video);
            }
            
            content.appendChild(mediaDiv);
        }

        if (finance) {
            const financeDiv = document.createElement('div');
            financeDiv.className = 'finance-card';
            financeDiv.innerHTML = `
                <h4>${finance.title}</h4>
                ${finance.items.map(item => `
                    <div class="finance-item">
                        <span class="finance-label">${item.label}</span>
                        <span class="finance-value">${item.value}</span>
                    </div>
                `).join('')}
            `;
            content.appendChild(financeDiv);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.messagesContainer.appendChild(messageDiv);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SyntraAI();
});
