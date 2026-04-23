/**
 * Simple Environmental Conservation Chatbot
 * - Uses local Q&A dataset (50+ entries)
 * - Matches user questions using keyword + token similarity scoring
 * - Returns a helpful default response if no strong match exists
 */

const ENVIRONMENTAL_QA_PAIRS = [
    // General conversation and assistant identity
    {
        question: 'Who are you?',
        answer: 'I am an Environmental Conservation chatbot. I answer questions about pollution, climate change, recycling, forests, wildlife, and sustainable living.',
        keywords: ['who are you', 'your name', 'assistant', 'chatbot']
    },
    {
        question: 'What do you do?',
        answer: 'I provide simple environmental guidance using a prepared Q&A knowledge base. You can ask me practical conservation questions anytime.',
        keywords: ['what do you do', 'help', 'purpose', 'support']
    },
    {
        question: 'How can you help me?',
        answer: 'I can explain environmental topics, suggest eco-friendly actions, and answer questions on pollution, climate change, recycling, deforestation, wildlife, and sustainability.',
        keywords: ['how can you help', 'help me', 'assist', 'support']
    },
    {
        question: 'What is environment?',
        answer: 'The environment includes all living and non-living things around us, such as air, water, land, plants, animals, and human communities.',
        keywords: ['what is environment', 'environment meaning', 'define environment']
    },
    {
        question: 'What is the importance of environment?',
        answer: 'A healthy environment supports life, clean air and water, food production, climate balance, and livelihoods. Protecting it protects our future.',
        keywords: ['importance of environment', 'why environment important', 'healthy environment']
    },
    {
        question: 'What are environmental issues?',
        answer: 'Common environmental issues include pollution, climate change, biodiversity loss, deforestation, water scarcity, and poor waste management.',
        keywords: ['environmental issues', 'problems', 'challenges', 'threats']
    },
    {
        question: 'Give me environmental tips',
        answer: 'Start with simple habits: reduce single-use plastic, save electricity and water, separate waste, plant trees, and use public transport when possible.',
        keywords: ['tips', 'environmental tips', 'eco tips', 'daily actions']
    },
    {
        question: 'Hello',
        answer: 'Hello. I am here to help with environmental conservation questions. What would you like to learn today?',
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening']
    },
    {
        question: 'Thank you',
        answer: 'You are welcome. If you want, you can ask another question about conservation or sustainable living.',
        keywords: ['thank you', 'thanks', 'appreciate']
    },
    {
        question: 'What topics can I ask you?',
        answer: 'You can ask about pollution, climate change, recycling, deforestation, wildlife protection, sustainable living, and general environmental awareness.',
        keywords: ['topics', 'what can i ask', 'what can you answer', 'questions']
    },

    // Pollution
    {
        question: 'What is pollution?',
        answer: 'Pollution is the introduction of harmful substances into air, water, or soil that damages ecosystems and human health.',
        keywords: ['pollution', 'air', 'water', 'soil', 'harmful']
    },
    {
        question: 'How does air pollution affect health?',
        answer: 'Air pollution can cause asthma, lung disease, heart problems, and other long-term health issues, especially in children and older adults.',
        keywords: ['air pollution', 'health', 'asthma', 'lungs', 'heart']
    },
    {
        question: 'What are major causes of air pollution?',
        answer: 'Major sources include vehicle emissions, industrial smoke, burning fossil fuels, and open waste burning.',
        keywords: ['causes', 'air pollution', 'vehicle', 'industry', 'fossil fuels']
    },
    {
        question: 'How can I reduce air pollution in my community?',
        answer: 'Use public transport, avoid open burning, plant trees, support clean energy, and promote energy-efficient practices.',
        keywords: ['reduce', 'air pollution', 'community', 'trees', 'clean energy']
    },
    {
        question: 'What is water pollution?',
        answer: 'Water pollution occurs when harmful chemicals, plastics, sewage, or waste contaminate rivers, lakes, and oceans.',
        keywords: ['water pollution', 'rivers', 'lakes', 'oceans', 'sewage']
    },
    {
        question: 'How can we prevent water pollution?',
        answer: 'Dispose of waste properly, reduce plastic use, treat wastewater, avoid dumping chemicals, and protect wetlands.',
        keywords: ['prevent', 'water pollution', 'waste', 'plastic', 'wastewater']
    },
    {
        question: 'What is land pollution?',
        answer: 'Land pollution is the degradation of soil quality due to litter, hazardous waste, chemicals, and poor waste management.',
        keywords: ['land pollution', 'soil', 'waste', 'chemicals', 'litter']
    },
    {
        question: 'What is noise pollution?',
        answer: 'Noise pollution is excessive sound from traffic, factories, or construction that harms human health and wildlife behavior.',
        keywords: ['noise pollution', 'traffic', 'factories', 'construction', 'wildlife']
    },
    {
        question: 'How does plastic pollution harm marine life?',
        answer: 'Marine animals can ingest or get entangled in plastic, causing injuries, starvation, and death.',
        keywords: ['plastic pollution', 'marine life', 'ocean', 'animals', 'entangled']
    },
    {
        question: 'What can schools do to fight pollution?',
        answer: 'Schools can run cleanup campaigns, teach environmental education, reduce single-use plastic, and improve waste sorting.',
        keywords: ['schools', 'pollution', 'cleanup', 'education', 'waste sorting']
    },

    // Climate change
    {
        question: 'What is climate change?',
        answer: 'Climate change is the long-term shift in temperature and weather patterns, largely caused by human greenhouse gas emissions.',
        keywords: ['climate change', 'temperature', 'weather', 'greenhouse gases']
    },
    {
        question: 'What causes global warming?',
        answer: 'Global warming is mainly caused by greenhouse gases like carbon dioxide and methane released from fossil fuel use and deforestation.',
        keywords: ['global warming', 'carbon dioxide', 'methane', 'fossil fuels', 'deforestation']
    },
    {
        question: 'What are greenhouse gases?',
        answer: 'Greenhouse gases trap heat in the atmosphere. Common examples are carbon dioxide, methane, and nitrous oxide.',
        keywords: ['greenhouse gases', 'carbon dioxide', 'methane', 'atmosphere']
    },
    {
        question: 'How does climate change affect rainfall?',
        answer: 'Climate change can make rainfall patterns less predictable, causing floods in some areas and droughts in others.',
        keywords: ['climate change', 'rainfall', 'floods', 'drought']
    },
    {
        question: 'How does climate change affect agriculture?',
        answer: 'It can reduce crop yields, increase pests, and create water stress, making farming less stable and more costly.',
        keywords: ['climate', 'agriculture', 'crops', 'pests', 'water stress']
    },
    {
        question: 'How can individuals help fight climate change?',
        answer: 'Use less energy, choose public transport, eat sustainably, reduce waste, and support climate-friendly policies.',
        keywords: ['individual', 'fight climate', 'energy', 'transport', 'waste']
    },
    {
        question: 'Why are heatwaves increasing?',
        answer: 'Rising global temperatures increase the frequency and intensity of heatwaves in many regions.',
        keywords: ['heatwave', 'temperature', 'global warming']
    },
    {
        question: 'What is climate adaptation?',
        answer: 'Climate adaptation means adjusting systems and communities to reduce damage from climate impacts such as floods and droughts.',
        keywords: ['adaptation', 'climate', 'floods', 'droughts', 'communities']
    },
    {
        question: 'What is climate mitigation?',
        answer: 'Climate mitigation means reducing greenhouse gas emissions and increasing carbon sinks like forests.',
        keywords: ['mitigation', 'emissions', 'carbon sink', 'forests']
    },
    {
        question: 'Can planting trees help climate change?',
        answer: 'Yes. Trees absorb carbon dioxide and improve ecosystems, but they should complement broader emission reductions.',
        keywords: ['plant trees', 'climate', 'carbon dioxide', 'emissions']
    },

    // Recycling
    {
        question: 'What is recycling?',
        answer: 'Recycling is the process of converting used materials into new products to reduce waste and save resources.',
        keywords: ['recycling', 'waste', 'materials', 'resources']
    },
    {
        question: 'Why is recycling important?',
        answer: 'Recycling reduces landfill waste, saves energy, conserves raw materials, and lowers pollution.',
        keywords: ['important', 'recycling', 'landfill', 'energy', 'materials']
    },
    {
        question: 'What materials can be recycled?',
        answer: 'Common recyclable materials include paper, cardboard, glass, metals, and some plastics depending on local systems.',
        keywords: ['materials', 'recycled', 'paper', 'glass', 'metals', 'plastic']
    },
    {
        question: 'What is the difference between reuse and recycle?',
        answer: 'Reuse means using an item again without processing. Recycling means processing waste into new products.',
        keywords: ['reuse', 'recycle', 'difference']
    },
    {
        question: 'How do I start recycling at home?',
        answer: 'Set up labeled bins, separate paper/plastic/glass/metal, rinse containers, and follow local collection guidelines.',
        keywords: ['recycling at home', 'bins', 'separate', 'containers']
    },
    {
        question: 'What is contamination in recycling?',
        answer: 'Contamination happens when non-recyclable or dirty items are mixed with recyclables, reducing recovery quality.',
        keywords: ['contamination', 'recycling', 'dirty items', 'mixed waste']
    },
    {
        question: 'Can plastic bags be recycled?',
        answer: 'Many curbside systems do not accept plastic bags. Use dedicated drop-off points where available.',
        keywords: ['plastic bags', 'recycle', 'drop-off']
    },
    {
        question: 'What does reduce reuse recycle mean?',
        answer: 'It is a waste hierarchy: reduce what you consume first, reuse items second, and recycle what remains.',
        keywords: ['reduce reuse recycle', 'waste hierarchy', 'consume']
    },
    {
        question: 'How does recycling save energy?',
        answer: 'Manufacturing with recycled materials often uses less energy than extracting and processing raw materials.',
        keywords: ['recycling', 'save energy', 'raw materials', 'manufacturing']
    },
    {
        question: 'Can e-waste be recycled?',
        answer: 'Yes. Electronics should be sent to certified e-waste recyclers to recover valuable metals safely.',
        keywords: ['e-waste', 'electronics', 'recycle', 'metals']
    },

    // Deforestation
    {
        question: 'What is deforestation?',
        answer: 'Deforestation is the large-scale removal of forests, often for agriculture, logging, mining, or settlement expansion.',
        keywords: ['deforestation', 'forests', 'logging', 'agriculture', 'mining']
    },
    {
        question: 'Why is deforestation a problem?',
        answer: 'It causes biodiversity loss, increases carbon emissions, disrupts rainfall, and degrades soil and water systems.',
        keywords: ['deforestation', 'problem', 'biodiversity', 'emissions', 'rainfall']
    },
    {
        question: 'How does deforestation affect climate?',
        answer: 'Cutting forests releases stored carbon and reduces carbon absorption, worsening global warming.',
        keywords: ['deforestation', 'climate', 'carbon', 'global warming']
    },
    {
        question: 'How does deforestation affect wildlife?',
        answer: 'It destroys habitats, fragments ecosystems, and pushes many species toward extinction.',
        keywords: ['deforestation', 'wildlife', 'habitat', 'extinction']
    },
    {
        question: 'What are main drivers of deforestation?',
        answer: 'Major drivers include agricultural expansion, illegal logging, charcoal production, and infrastructure growth.',
        keywords: ['drivers', 'deforestation', 'agriculture', 'illegal logging', 'charcoal']
    },
    {
        question: 'What is reforestation?',
        answer: 'Reforestation is planting trees in areas where forests were cut or degraded to restore ecological function.',
        keywords: ['reforestation', 'planting trees', 'restore']
    },
    {
        question: 'How can communities reduce deforestation?',
        answer: 'Communities can support agroforestry, enforce forest laws, use alternative energy, and protect local forest reserves.',
        keywords: ['communities', 'reduce deforestation', 'agroforestry', 'forest laws']
    },
    {
        question: 'What is agroforestry?',
        answer: 'Agroforestry combines trees with crops or livestock systems to improve soil, biodiversity, and farm resilience.',
        keywords: ['agroforestry', 'trees', 'crops', 'livestock']
    },
    {
        question: 'Why are mangroves important?',
        answer: 'Mangroves protect coastlines from erosion and storms, store carbon, and provide nursery habitat for fish.',
        keywords: ['mangroves', 'coastline', 'erosion', 'carbon', 'fish']
    },
    {
        question: 'Can tree planting alone stop deforestation?',
        answer: 'Tree planting helps, but long-term impact requires forest protection, law enforcement, and sustainable land use.',
        keywords: ['tree planting', 'stop deforestation', 'forest protection']
    },

    // Wildlife protection
    {
        question: 'Why is wildlife conservation important?',
        answer: 'Wildlife supports ecosystem balance, pollination, food webs, and cultural and economic value for communities.',
        keywords: ['wildlife conservation', 'ecosystem balance', 'pollination', 'food web']
    },
    {
        question: 'What threatens wildlife most?',
        answer: 'Habitat loss, poaching, pollution, invasive species, and climate change are major threats.',
        keywords: ['threats', 'wildlife', 'habitat loss', 'poaching', 'pollution']
    },
    {
        question: 'How does poaching affect wildlife?',
        answer: 'Poaching reduces species populations, disrupts breeding, and can collapse ecosystems dependent on key species.',
        keywords: ['poaching', 'wildlife', 'species', 'ecosystem']
    },
    {
        question: 'What is a protected area?',
        answer: 'A protected area is land or sea managed to conserve biodiversity, habitats, and ecological services.',
        keywords: ['protected area', 'biodiversity', 'habitats', 'conserve']
    },
    {
        question: 'How can people help protect wildlife?',
        answer: 'Avoid wildlife products, report illegal trade, support conservation groups, and protect local habitats.',
        keywords: ['help protect wildlife', 'illegal trade', 'habitats', 'conservation groups']
    },
    {
        question: 'Why are pollinators important?',
        answer: 'Pollinators like bees and butterflies support food production by enabling plant reproduction.',
        keywords: ['pollinators', 'bees', 'butterflies', 'food production']
    },
    {
        question: 'How can we protect endangered species?',
        answer: 'Protect habitats, enforce anti-poaching laws, reduce human-wildlife conflict, and support breeding programs.',
        keywords: ['endangered species', 'habitats', 'anti-poaching', 'breeding']
    },
    {
        question: 'What is human wildlife conflict?',
        answer: 'It occurs when wildlife and people compete for space or resources, causing harm to livelihoods or animals.',
        keywords: ['human wildlife conflict', 'resources', 'space', 'livelihoods']
    },
    {
        question: 'Why are wetlands important for wildlife?',
        answer: 'Wetlands provide breeding and feeding grounds for fish, birds, amphibians, and many other species.',
        keywords: ['wetlands', 'wildlife', 'birds', 'fish', 'breeding']
    },
    {
        question: 'Can ecotourism support wildlife conservation?',
        answer: 'Yes, responsible ecotourism can fund conservation and create incentives for communities to protect habitats.',
        keywords: ['ecotourism', 'wildlife conservation', 'communities', 'habitats']
    },

    // Sustainable living
    {
        question: 'What is sustainable living?',
        answer: 'Sustainable living means using resources in ways that meet current needs without harming future generations.',
        keywords: ['sustainable living', 'resources', 'future generations']
    },
    {
        question: 'How can I live more sustainably?',
        answer: 'Save energy and water, reduce waste, choose durable products, eat responsibly, and use low-carbon transport.',
        keywords: ['live sustainably', 'save energy', 'save water', 'reduce waste']
    },
    {
        question: 'What are simple eco friendly habits?',
        answer: 'Carry reusable bags and bottles, switch off unused lights, repair items, and avoid unnecessary packaging.',
        keywords: ['eco friendly', 'habits', 'reusable', 'lights', 'packaging']
    },
    {
        question: 'How does saving water help the environment?',
        answer: 'Saving water reduces pressure on freshwater ecosystems and lowers energy used in pumping and treatment.',
        keywords: ['saving water', 'freshwater', 'ecosystems', 'treatment']
    },
    {
        question: 'How does energy efficiency help conservation?',
        answer: 'Energy efficiency lowers fuel demand, reduces emissions, and decreases environmental damage from energy production.',
        keywords: ['energy efficiency', 'emissions', 'fuel demand', 'conservation']
    },
    {
        question: 'What is a carbon footprint?',
        answer: 'A carbon footprint is the total greenhouse gas emissions caused directly and indirectly by your activities.',
        keywords: ['carbon footprint', 'emissions', 'activities']
    },
    {
        question: 'How can I reduce my carbon footprint?',
        answer: 'Use public transit, reduce energy use, eat more plant-based meals, buy local products, and minimize waste.',
        keywords: ['reduce carbon footprint', 'public transit', 'energy', 'plant-based', 'waste']
    },
    {
        question: 'Is composting good for the environment?',
        answer: 'Yes, composting reduces landfill waste and creates nutrient-rich soil that supports healthy plant growth.',
        keywords: ['composting', 'landfill', 'soil', 'plant growth']
    },
    {
        question: 'How can businesses be more sustainable?',
        answer: 'Businesses can improve efficiency, cut waste, source responsibly, measure emissions, and adopt circular practices.',
        keywords: ['businesses', 'sustainable', 'efficiency', 'waste', 'circular']
    },
    {
        question: 'Why should we buy less and choose better products?',
        answer: 'Buying less reduces resource extraction and waste. Choosing durable products lowers environmental impact over time.',
        keywords: ['buy less', 'durable products', 'resource extraction', 'waste']
    },

    // Extra mixed environmental knowledge to exceed 50
    {
        question: 'What is biodiversity?',
        answer: 'Biodiversity is the variety of life at genetic, species, and ecosystem levels, essential for resilient ecosystems.',
        keywords: ['biodiversity', 'species', 'ecosystem', 'resilience']
    },
    {
        question: 'Why are forests important?',
        answer: 'Forests store carbon, protect water sources, support biodiversity, and provide livelihoods for many communities.',
        keywords: ['forests', 'carbon', 'water', 'biodiversity', 'livelihoods']
    },
    {
        question: 'What is environmental conservation?',
        answer: 'Environmental conservation is the protection, restoration, and sustainable use of natural resources and ecosystems.',
        keywords: ['environmental conservation', 'protection', 'restoration', 'resources']
    },
    {
        question: 'How can youth support conservation?',
        answer: 'Youth can join cleanup drives, environmental clubs, tree planting events, and awareness campaigns.',
        keywords: ['youth', 'conservation', 'cleanup', 'tree planting', 'awareness']
    },
    {
        question: 'What are renewable energy sources?',
        answer: 'Renewable energy comes from naturally replenished sources like solar, wind, hydro, and geothermal power.',
        keywords: ['renewable energy', 'solar', 'wind', 'hydro', 'geothermal']
    },
    {
        question: 'Why is waste segregation important?',
        answer: 'Waste segregation improves recycling, reduces contamination, and makes waste treatment safer and more efficient.',
        keywords: ['waste segregation', 'recycling', 'contamination', 'treatment']
    },
    {
        question: 'What is a circular economy?',
        answer: 'A circular economy designs out waste by reusing, repairing, remanufacturing, and recycling materials.',
        keywords: ['circular economy', 'reuse', 'repair', 'recycle']
    },
    {
        question: 'How does littering affect communities?',
        answer: 'Littering blocks drainage, increases flooding risk, spreads disease vectors, and harms local beauty and tourism.',
        keywords: ['littering', 'drainage', 'flooding', 'disease', 'tourism']
    },
    {
        question: 'What is environmental awareness?',
        answer: 'Environmental awareness is understanding environmental issues and taking informed action to protect nature.',
        keywords: ['environmental awareness', 'issues', 'action', 'protect nature']
    },
    {
        question: 'How can communities build climate resilience?',
        answer: 'Communities can improve water management, restore ecosystems, plan for disasters, and diversify livelihoods.',
        keywords: ['climate resilience', 'communities', 'water management', 'disasters', 'livelihoods']
    }
];

const DEFAULT_RESPONSE =
    'I could not find a close match for that question yet. Please try asking about who I am, what I do, what environment means, pollution, climate change, recycling, deforestation, wildlife protection, or sustainable living. For example: "What is environment?"';

const WEBSITE_INFO = {
    organization: 'Global Environmental Conservation Initiative (GECI)',
    summary: 'A community-driven environmental organization focused on conservation, sustainable practices, awareness, and protecting natural resources for future generations.',
    mission: 'To raise awareness, implement sustainable practices, and protect natural resources for future generations.',
    location: 'Environmental Conservation Center, Tanzania',
    email: 'aminshemsa@gmail.com',
    hours: 'Mon–Fri: 9:00 AM–5:00 PM',
    phones: [
        '+255 621 214 785',
        '+255 776 219 438'
    ]
};

class EnvironmentalChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.qaPairs = ENVIRONMENTAL_QA_PAIRS;
        this.minimumMatchScore = 0.14;
        this.init();
    }

    init() {
        this.createWidgetHTML();
        this.attachEventListeners();
        this.addBotMessage('Hello. I am your Environmental Conservation Assistant. Ask me about pollution, climate change, recycling, deforestation, wildlife, sustainable living, or website contact details.');
    }

    createWidgetHTML() {
        const button = document.createElement('button');
        button.className = 'chat-widget-button';
        button.id = 'chatWidgetButton';
        button.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
        button.setAttribute('title', 'Open chatbot');

        const container = document.createElement('div');
        container.className = 'chat-widget-container';
        container.id = 'chatWidgetContainer';
        container.innerHTML = `
            <div class="chat-header">
                <h3>Environmental Chatbot</h3>
                <p>Simple Q&A assistant for conservation topics</p>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-area">
                <textarea
                    class="chat-input-field"
                    id="chatInput"
                    placeholder="Ask a question..."
                    rows="1"
                ></textarea>
                <div class="chat-tools-row">
                    <button class="chat-send-btn" id="chatSendBtn" title="Send">Send</button>
                </div>
            </div>
        `;

        document.body.appendChild(button);
        document.body.appendChild(container);
    }

    attachEventListeners() {
        const button = document.getElementById('chatWidgetButton');
        const sendBtn = document.getElementById('chatSendBtn');
        const input = document.getElementById('chatInput');

        button.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());

        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = `${Math.min(input.scrollHeight, 90)}px`;
        });
    }

    toggleChat() {
        const button = document.getElementById('chatWidgetButton');
        const container = document.getElementById('chatWidgetContainer');
        this.isOpen = !this.isOpen;
        button.classList.toggle('active');
        container.classList.toggle('active');
        this.scrollToBottom();
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const userText = String(input.value || '').trim();
        if (!userText) return;

        this.addUserMessage(userText);
        input.value = '';
        input.style.height = 'auto';

        const answer = this.getBestAnswer(userText);
        this.addBotMessage(answer);
    }

    getBestAnswer(userInput) {
        const normalizedInput = this.normalizeText(userInput);
        if (!normalizedInput) return DEFAULT_RESPONSE;

        const greetingAnswer = this.getGreetingAnswer(normalizedInput);
        if (greetingAnswer) {
            return greetingAnswer;
        }

        const websiteAnswer = this.getWebsiteAnswer(normalizedInput);
        if (websiteAnswer) {
            return websiteAnswer;
        }

        let bestMatch = null;
        let highestScore = 0;

        for (const qa of this.qaPairs) {
            const score = this.calculateSimilarityScore(normalizedInput, qa);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = qa;
            }
        }

        if (!bestMatch || highestScore < this.minimumMatchScore) {
            return DEFAULT_RESPONSE;
        }

        return bestMatch.answer;
    }

    getGreetingAnswer(normalizedInput) {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        if (!this.matchesAny(normalizedInput, greetings)) {
            return null;
        }

        return 'Hello. I am here to help with environmental conservation and website information like contact numbers, email, location, and about us.';
    }

    getWebsiteAnswer(normalizedInput) {
        const wantsPhone = this.matchesAny(normalizedInput, ['phone', 'number', 'contact number', 'call', 'mobile']);
        const wantsContact = this.matchesAny(normalizedInput, ['contact', 'reach you', 'get in touch', 'contact us']);
        const wantsEmail = this.matchesAny(normalizedInput, ['email', 'mail']);
        const wantsLocation = this.matchesAny(normalizedInput, ['location', 'office', 'address', 'where are you', 'where can i find you']);
        const wantsAbout = this.matchesAny(normalizedInput, ['about', 'about us', 'company', 'organization', 'website summary', 'summarize website', 'mission', 'vision', 'what is geci']);
        const wantsHours = this.matchesAny(normalizedInput, ['hours', 'open', 'opening time', 'working time']);

        if (wantsPhone || wantsContact) {
            return `You can contact ${WEBSITE_INFO.organization} on ${WEBSITE_INFO.phones[0]} or ${WEBSITE_INFO.phones[1]}.`;
        }

        if (wantsEmail) {
            return `Our email is ${WEBSITE_INFO.email}.`;
        }

        if (wantsLocation) {
            return `We are located at ${WEBSITE_INFO.location}.`;
        }

        if (wantsHours) {
            return `Our operating hours are ${WEBSITE_INFO.hours}.`;
        }

        if (wantsAbout) {
            return `${WEBSITE_INFO.organization}: ${WEBSITE_INFO.summary} Mission: ${WEBSITE_INFO.mission} You can also visit the About Us page for team details and initiatives.`;
        }

        return null;
    }

    matchesAny(text, phrases) {
        const input = String(text || '');
        return phrases.some((phrase) => input.includes(this.normalizeText(phrase)));
    }

    calculateSimilarityScore(normalizedInput, qa) {
        const questionText = this.normalizeText(qa.question);
        const inputTokens = this.tokenize(normalizedInput);
        const questionTokens = this.tokenize(questionText);

        if (!inputTokens.length || !questionTokens.length) {
            return 0;
        }

        if (normalizedInput === questionText) {
            return 1;
        }

        let keywordHits = 0;
        const keywords = Array.isArray(qa.keywords) ? qa.keywords : [];
        for (const keyword of keywords) {
            const normalizedKeyword = this.normalizeText(keyword);
            if (normalizedKeyword && normalizedInput.includes(normalizedKeyword)) {
                keywordHits += 1;
            }
        }

        const tokenIntersection = inputTokens.filter((token) => questionTokens.includes(token));
        const tokenUnionSize = new Set([...inputTokens, ...questionTokens]).size;
        const jaccardSimilarity = tokenUnionSize > 0 ? tokenIntersection.length / tokenUnionSize : 0;

        const coverageSimilarity = tokenIntersection.length / Math.max(1, inputTokens.length);
        const keywordSimilarity = keywords.length > 0 ? keywordHits / keywords.length : 0;
        const textSimilarity = this.getBigramDiceSimilarity(normalizedInput, questionText);

        const containsBoost =
            normalizedInput.includes(questionText) || questionText.includes(normalizedInput)
                ? 0.12
                : 0;

        // Weighted score: keyword intent + token overlap + coverage + typo-tolerant text similarity
        return (keywordSimilarity * 0.35)
            + (jaccardSimilarity * 0.25)
            + (coverageSimilarity * 0.20)
            + (textSimilarity * 0.20)
            + containsBoost;
    }

    getBigramDiceSimilarity(a, b) {
        const left = String(a || '');
        const right = String(b || '');
        if (!left || !right) return 0;
        if (left === right) return 1;

        const leftBigrams = this.toBigrams(left);
        const rightBigrams = this.toBigrams(right);
        if (!leftBigrams.length || !rightBigrams.length) return 0;

        let overlap = 0;
        const rightCounts = new Map();
        rightBigrams.forEach((bg) => {
            rightCounts.set(bg, (rightCounts.get(bg) || 0) + 1);
        });

        leftBigrams.forEach((bg) => {
            const count = rightCounts.get(bg) || 0;
            if (count > 0) {
                overlap += 1;
                rightCounts.set(bg, count - 1);
            }
        });

        return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
    }

    toBigrams(text) {
        const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
        if (cleaned.length < 2) return [];
        const bigrams = [];
        for (let i = 0; i < cleaned.length - 1; i += 1) {
            bigrams.push(cleaned.slice(i, i + 2));
        }
        return bigrams;
    }

    normalizeText(text) {
        const normalized = String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Normalize common variants and frequent misspellings for better matching.
        return normalized
            .replace(/\benviroment\b/g, 'environment')
            .replace(/\benviornment\b/g, 'environment')
            .replace(/\bclimatechange\b/g, 'climate change')
            .replace(/\brecycleing\b/g, 'recycling')
            .replace(/\bdeforastation\b/g, 'deforestation')
            .replace(/\bwild life\b/g, 'wildlife')
            .replace(/\bwhats\b/g, 'what is')
            .replace(/\bim\b/g, 'i am');
    }

    tokenize(text) {
        return this.normalizeText(text)
            .split(' ')
            .filter((token) => token.length > 2);
    }

    addUserMessage(text) {
        const messagesDiv = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `<div class="message-bubble">${this.escapeHtml(text)}</div>`;
        messagesDiv.appendChild(messageDiv);
        this.messages.push({ type: 'user', text });
        this.scrollToBottom();
    }

    addBotMessage(text) {
        const messagesDiv = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.innerHTML = `<div class="message-bubble">${this.formatBotMessage(text)}</div>`;
        messagesDiv.appendChild(messageDiv);
        this.messages.push({ type: 'bot', text });
        this.scrollToBottom();
    }

    formatBotMessage(text) {
        return this.escapeHtml(String(text || '')).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text || '');
        return div.innerHTML;
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return;
        setTimeout(() => {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 0);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.chatbot = new EnvironmentalChatbot();
    });
} else {
    window.chatbot = new EnvironmentalChatbot();
}
