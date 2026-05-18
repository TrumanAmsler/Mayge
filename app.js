const Scryfall = {
  named: (name) => `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,
  search: (query) => `https://api.scryfall.com/cards/search?unique=cards&order=cmc&q=${encodeURIComponent(query)}`
};

const roleQueries = {
  engine: ['draw a card', 'whenever', 'create', 'counter', 'token', 'sacrifice', 'graveyard', 'cast'],
  payoff: ['win the game', 'double', 'damage', 'drain', 'gets +1/+1', 'copy', 'extra turn'],
  ramp: ['add mana', 'search your library for a land', 'treasure', 'costs less'],
  draw: ['draw a card', 'look at the top', 'impulse', 'whenever you cast'],
  interaction: ['destroy target', 'exile target', 'counter target', 'return target'],
  protection: ['hexproof', 'indestructible', 'phase out', 'protection', 'prevent all damage']
};

const powerProfiles = {
  casual: { maxManaValue: 6, tutorPenalty: 3, fastManaBonus: 0 },
  focused: { maxManaValue: 5, tutorPenalty: 1, fastManaBonus: 1 },
  high: { maxManaValue: 4, tutorPenalty: 0, fastManaBonus: 2 },
  cedh: { maxManaValue: 3, tutorPenalty: 0, fastManaBonus: 4 }
};

let currentCommander = null;
let activeRole = 'engine';

const els = {
  form: document.querySelector('#commanderForm'),
  input: document.querySelector('#commanderInput'),
  status: document.querySelector('#statusPill'),
  power: document.querySelector('#powerLevel'),
  theme: document.querySelector('#themeInput'),
  commanderView: document.querySelector('#commanderView'),
  commanderImage: document.querySelector('#commanderImage'),
  commanderName: document.querySelector('#commanderName'),
  commanderType: document.querySelector('#commanderType'),
  commanderText: document.querySelector('#commanderText'),
  colorIdentity: document.querySelector('#colorIdentity'),
  manaValue: document.querySelector('#manaValue'),
  commanderLegal: document.querySelector('#commanderLegal'),
  recommendButton: document.querySelector('#recommendButton'),
  cardGrid: document.querySelector('#cardGrid'),
  roleTabs: document.querySelector('.role-tabs')
};

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadCommander(els.input.value.trim());
});

els.recommendButton.addEventListener('click', () => findRecommendations(activeRole));

els.roleTabs.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-role]');
  if (!button) return;
  activeRole = button.dataset.role;
  document.querySelectorAll('.role-tabs button').forEach((tab) => tab.classList.toggle('active', tab === button));
  if (currentCommander) findRecommendations(activeRole);
});

async function loadCommander(name) {
  if (!name) return;

  setStatus('Looking up');
  renderLoading(`Finding ${name}...`);

  try {
    const card = await fetchJson(Scryfall.named(name));
    currentCommander = normalizeCard(card);
    renderCommander(currentCommander);
    els.recommendButton.disabled = false;
    setStatus('Commander loaded');
    await findRecommendations(activeRole);
  } catch (error) {
    setStatus('Error');
    renderError(error.message);
  }
}

async function findRecommendations(role) {
  if (!currentCommander) return;

  setStatus('Searching');
  renderLoading(`Finding ${role} cards...`);

  try {
    const response = await searchWithFallback(currentCommander, role);
    const cards = response.data
      .map(normalizeCard)
      .filter((card) => card.name !== currentCommander.name)
      .map((card) => ({ ...card, synergyScore: scoreCard(card, currentCommander, role) }))
      .sort((a, b) => b.synergyScore - a.synergyScore)
      .slice(0, 12);

    renderCards(cards, role);
    setStatus(`${cards.length} picks`);
  } catch (error) {
    setStatus('Error');
    renderError(error.message);
  }
}

async function searchWithFallback(commander, role) {
  try {
    return await fetchJson(Scryfall.search(buildSearchQuery(commander, role, true)));
  } catch (error) {
    return fetchJson(Scryfall.search(buildSearchQuery(commander, role, false)));
  }
}

function buildSearchQuery(commander, role, includeSynergy) {
  const identity = commander.colorIdentity.length ? commander.colorIdentity.join('') : 'c';
  const roleTerms = roleQueries[role].map((term) => `o:"${term}"`).join(' or ');
  const theme = els.theme.value.trim();
  const synergyTerms = theme ? theme.split(',').map((term) => term.trim()) : inferCommanderTerms(commander);
  const synergyClause = includeSynergy && synergyTerms.length
    ? ` (${synergyTerms.map((term) => `o:"${term}"`).join(' or ')})`
    : '';

  return `legal:commander id<=${identity} -is:digital -t:conspiracy (${roleTerms})${synergyClause}`;
}

function inferCommanderTerms(commander) {
  const text = `${commander.typeLine} ${commander.oracleText}`.toLowerCase();
  const signals = [
    'proliferate',
    'token',
    'sacrifice',
    'graveyard',
    'artifact',
    'enchantment',
    'aura',
    'equipment',
    'treasure',
    'lifegain',
    'draw',
    'discard',
    'exile',
    'cast',
    'copy'
  ];

  const matches = signals.filter((signal) => text.includes(signal));
  if (!matches.length && text.includes('counter')) matches.push('counter');
  return matches.slice(0, 4);
}

function scoreCard(card, commander, role) {
  const profile = powerProfiles[els.power.value];
  const commanderWords = keywordSet(commander.oracleText);
  const cardWords = keywordSet(card.oracleText);
  const sharedWords = [...cardWords].filter((word) => commanderWords.has(word)).length;
  const roleHits = roleQueries[role].filter((term) => card.oracleText.toLowerCase().includes(term)).length;
  const themeHits = els.theme.value
    .split(',')
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean)
    .filter((term) => card.oracleText.toLowerCase().includes(term) || card.typeLine.toLowerCase().includes(term)).length;
  const manaEfficiency = Math.max(0, profile.maxManaValue - card.manaValue);
  const tutorPenalty = /search your library/i.test(card.oracleText) ? profile.tutorPenalty : 0;
  const fastManaBonus = /add (one|two|three|\{[wubrgc]\})/i.test(card.oracleText) && card.manaValue <= 2 ? profile.fastManaBonus : 0;
  const popularityPenalty = card.edhrecRank ? Math.max(0, 4 - Math.log10(card.edhrecRank)) : 0;

  return Math.round(
    sharedWords * 1.2 +
    roleHits * 4 +
    themeHits * 3 +
    manaEfficiency * 1.5 +
    fastManaBonus -
    tutorPenalty -
    popularityPenalty
  );
}

function keywordSet(text) {
  const ignored = new Set(['the', 'and', 'you', 'your', 'that', 'this', 'with', 'from', 'card', 'cards', 'target']);
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9 +/]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !ignored.has(word))
  );
}

function normalizeCard(card) {
  const face = card.card_faces?.[0] || card;
  return {
    name: card.name,
    manaValue: card.cmc || 0,
    typeLine: card.type_line || face.type_line || '',
    oracleText: card.oracle_text || card.card_faces?.map((cardFace) => cardFace.oracle_text).join('\n') || '',
    colorIdentity: card.color_identity || [],
    legalCommander: card.legalities?.commander || 'unknown',
    commanderCandidate: isCommanderCandidate(card),
    edhrecRank: card.edhrec_rank || null,
    image: card.image_uris?.normal || face.image_uris?.normal || '',
    scryfallUri: card.scryfall_uri
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.details || 'Scryfall request failed.');
  }

  return payload;
}

function renderCommander(card) {
  els.commanderView.hidden = false;
  els.commanderImage.src = card.image;
  els.commanderImage.alt = card.name;
  els.commanderName.textContent = card.name;
  els.commanderType.textContent = card.typeLine;
  els.commanderText.textContent = card.oracleText;
  els.colorIdentity.textContent = card.colorIdentity.length ? card.colorIdentity.join('') : 'Colorless';
  els.manaValue.textContent = card.manaValue;
  els.commanderLegal.textContent = card.commanderCandidate && card.legalCommander === 'legal' ? 'Valid commander' : 'Check rules';
  els.commanderLegal.classList.toggle('error', !card.commanderCandidate || card.legalCommander !== 'legal');
}

function isCommanderCandidate(card) {
  const typeLine = card.type_line || card.card_faces?.map((face) => face.type_line).join(' ') || '';
  const oracleText = card.oracle_text || card.card_faces?.map((face) => face.oracle_text).join(' ') || '';
  return /legendary.*creature/i.test(typeLine) || /can be your commander/i.test(oracleText);
}

function renderCards(cards, role) {
  if (!cards.length) {
    renderLoading(`No ${role} recommendations found. Try a broader theme.`);
    return;
  }

  els.cardGrid.innerHTML = cards.map((card) => `
    <article class="card-result">
      <h3><a href="${card.scryfallUri}" target="_blank" rel="noreferrer">${escapeHtml(card.name)}</a></h3>
      <div class="card-meta">
        <span class="chip">MV ${card.manaValue}</span>
        <span class="chip">${escapeHtml(card.typeLine)}</span>
        <span class="chip score">Synergy ${card.synergyScore}</span>
      </div>
      <p>${escapeHtml(explainPick(card, role))}</p>
    </article>
  `).join('');
}

function explainPick(card, role) {
  const roleName = role.replace('-', ' ');
  const efficient = card.manaValue <= powerProfiles[els.power.value].maxManaValue ? 'efficiently costed' : 'higher-impact';
  return `${card.name} is a ${efficient} ${roleName} option that overlaps with the commander plan through its rules text and role coverage.`;
}

function renderLoading(message) {
  els.cardGrid.innerHTML = `
    <article class="empty-state">
      <h3>${escapeHtml(message)}</h3>
      <p>Using Scryfall card data and a local synergy score.</p>
    </article>
  `;
}

function renderError(message) {
  els.cardGrid.innerHTML = `
    <article class="empty-state">
      <h3 class="error">Something did not resolve.</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function setStatus(message) {
  els.status.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
