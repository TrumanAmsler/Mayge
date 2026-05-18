# Mayge
AI-assisted Magic: The Gathering Commander deckbuilder that recommends cards by synergy, role coverage, theme fit, and power level instead of popularity. Uses live Scryfall data to analyze commanders and surface role-based picks for ramp, draw, interaction, protection, engines, and payoffs.
# Mayge Commander Lab

Mayge Commander Lab is an early AI-assisted deckbuilding interface for Magic: The Gathering's Commander format. The goal is to help players build stronger, more synergistic Commander decks by prioritizing card interactions, deck roles, and strategy fit over raw popularity.

The current prototype is a lightweight browser application that uses live Scryfall card data to analyze a chosen commander and recommend cards by deckbuilding role.

## Features

- Commander lookup using the Scryfall API
- Commander legality and color identity display
- Card image, mana value, type line, and rules text preview
- Role-based recommendations for:
  - Engine pieces
  - Payoffs
  - Ramp
  - Card draw
  - Interaction
  - Protection
- Theme-aware card filtering for strategies such as tokens, counters, sacrifice, graveyard, artifacts, and enchantments
- Configurable power targets:
  - Casual
  - Focused
  - High Power
  - cEDH
- Local synergy scoring based on commander text, card role, mana efficiency, theme overlap, and power-level preferences

## Project Goal

Most Commander deckbuilding tools rely heavily on popularity data. Mayge is designed around a different idea: the best card for a deck is not always the most played card.

The long-term goal is to build an AI deckbuilding assistant that can:

- Understand a commander's actual game plan
- Recommend cards based on synergy and efficiency
- Tune decks to a selected power level
- Explain why each card belongs in the deck
- Identify weak cards, missing roles, and upgrade paths
- Generate complete Commander decklists with coherent strategy and role balance

## Tech Stack

Current prototype:

- HTML
- CSS
- JavaScript
- Scryfall API

No build tools or dependencies are required for the first version.

## Getting Started

Open `index.html` in a browser.

Alternatively, run a local static server from the project folder:

```bash
python -m http.server 4173
```

Then visit:

```text
http://127.0.0.1:4173
```

## How To Use

1. Enter a Commander name, such as `Atraxa, Praetors' Voice`.
2. Select a target power level.
3. Optionally enter a preferred theme, such as `tokens`, `counters`, or `sacrifice`.
4. Click `Analyze`.
5. Browse recommendations by role.
6. Open card links in Scryfall for more details.

## Current Limitations

- Recommendations are powered by an early heuristic scoring model.
- The app does not yet generate full 100-card decklists.
- It does not yet track owned cards, budget, or collection constraints.
- Combo detection and advanced rules interpretation are planned but not implemented.
- Recommendations depend on live Scryfall API availability.

## Roadmap

- Add a full Commander deck legality checker
- Generate complete 100-card deck shells
- Add role-count targets based on deck archetype and power level
- Improve synergy scoring with mechanic and archetype detection
- Add budget filters
- Add export support for Moxfield, Archidekt, and plain-text decklists
- Add AI explanations for each recommendation
- Add deck analysis for uploaded lists
- Add combo and win-condition detection
- Add local card database caching for faster searches

## Status

This project is in early prototype development. The first milestone is focused on proving the core idea: Commander recommendations should be driven by synergy, role coverage, and strategic fit rather than popularity alone.
