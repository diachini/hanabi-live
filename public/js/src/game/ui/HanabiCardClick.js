/*
    Click functions for the HanabiCard object
*/

// Imports
const constants = require('../../constants');
const globals = require('./globals');
const notes = require('./notes');
const replay = require('./replay');

module.exports = function click(event) {
    // Disable all click events if the card is tweening
    if (this.tweening) {
        return;
    }

    // Speedrunning overrides the normal card clicking behavior
    // (but don't use the speedrunning behavior if
    // we are in a solo replay / shared replay / spectating)
    if (globals.speedrun && !globals.replay && !globals.spectating) {
        return;
    }

    if (event.evt.which === 1) { // Left-click
        clickLeft(this, event.evt);
    } else if (event.evt.which === 3) { // Right-click
        clickRight(this, event.evt);
    }
};

const clickLeft = (card, event) => {
    // The "Empathy" feature is handled above, so we don't have to worry about it here

    // No actions in this function use modifiers other than Alt
    if (event.ctrlKey || event.shiftKey || event.metaKey) {
        return;
    }

    if (event.altKey) {
        // Alt + clicking a card goes to the turn it was drawn
        gotoTurn(card.turnDrawn, card.order);
    } else if (card.isPlayed) {
        // Clicking on played cards goes to the turn immediately before they were played
        gotoTurn(card.turnPlayed, card.order);
    } else if (card.isDiscarded) {
        // Clicking on discarded cards goes to the turn immediately before they were discarded
        gotoTurn(card.turnDiscarded, card.order);
    }
};

const clickRight = (card, event) => {
    // Ctrl + shift + alt + right-click is a card morph
    if (
        event.ctrlKey
        && event.shiftKey
        && event.altKey
        && !event.metaKey
    ) {
        clickMorph(card.order);
        return;
    }

    // Right-click for a leader in a shared replay is to draw an arrow next to the card
    // The arrow is shown to all the members of the reply in order to draw attention to the card
    // (we want it to work no matter what modifiers are being pressed,
    // in case someone is pushing their push-to-talk hotkey while highlighting cards)
    if (
        globals.sharedReplay
        && globals.amSharedReplayLeader
        && globals.useSharedTurns
    ) {
        globals.lobby.conn.send('replayAction', {
            type: constants.REPLAY_ACTION_TYPE.ARROW,
            order: card.order,
        });

        // Draw the indicator manually so that we don't have to wait for the
        // client to server round-trip
        card.toggleSharedReplayIndicator();

        return;
    }

    // Ctrl + shift + right-click is a shortcut for entering the same note as previously entered
    // (this must be above the other note code because of the modifiers)
    if (
        event.ctrlKey
        && event.shiftKey
        && !event.altKey
        && !event.metaKey
        && !globals.replay
        && !globals.spectating
    ) {
        card.setNote(notes.vars.lastNote);
        return;
    }

    // Shift + right-click is a "f" note
    // (this is a common abbreviation for "this card is Finessed")
    if (
        !event.ctrlKey
        && event.shiftKey
        && !event.altKey
        && !event.metaKey
        && !globals.replay
        && !globals.spectating
    ) {
        card.setNote('f');
        return;
    }

    // Alt + right-click is a "cm" note
    // (this is a common abbreviation for "this card is chop moved")
    if (
        !event.ctrlKey
        && !event.shiftKey
        && event.altKey
        && !event.metaKey
        && !globals.replay
        && !globals.spectating
    ) {
        card.setNote('cm');
        return;
    }

    // Ctrl + right-click is a local arrow
    // Even if they are not a leader in a shared replay,
    // a user might still want to draw an arrow on a card for demonstration purposes
    // However, we don't want this functionality in shared replays because
    // it could be misleading as to who the real replay leader is
    if (
        event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
        && globals.sharedReplay === false
    ) {
        card.toggleSharedReplayIndicator();
        return;
    }

    // A normal right-click is edit a note
    if (
        !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
        && !globals.replay
        && !globals.spectating
    ) {
        notes.openEditTooltip(card);
    }
};

const gotoTurn = (turn, order) => {
    if (globals.replay) {
        replay.checkDisableSharedTurns();
    } else {
        replay.enter();
    }
    replay.goto(turn, true);

    // Also indicate the card to make it easier to find
    globals.deck[order].toggleSharedReplayIndicator();
};


// Morphing cards allows for creation of hypothetical situations
const clickMorph = (order) => {
    // Only allow this feature in replays
    if (!globals.replay) {
        return;
    }

    const card = prompt('What card do you want to morph it into?\n(e.g. "b1", "k2", "m3", "11", "65")');
    if (card === null || card.length !== 2) {
        return;
    }
    const suitLetter = card[0];
    let suit;
    if (suitLetter === 'b' || suitLetter === '1') {
        suit = 0;
    } else if (suitLetter === 'g' || suitLetter === '2') {
        suit = 1;
    } else if (suitLetter === 'y' || suitLetter === '3') {
        suit = 2;
    } else if (suitLetter === 'r' || suitLetter === '4') {
        suit = 3;
    } else if (suitLetter === 'p' || suitLetter === '5') {
        suit = 4;
    } else if (suitLetter === 'k' || suitLetter === 'm' || suitLetter === '6') {
        suit = 5;
    } else {
        return;
    }
    const rank = parseInt(card[1], 10);
    if (Number.isNaN(rank)) {
        return;
    }

    // Tell the server that we are doing a hypothetical
    if (globals.amSharedReplayLeader) {
        globals.lobby.conn.send('replayAction', {
            type: constants.REPLAY_ACTION_TYPE.MORPH,
            order,
            suit,
            rank,
        });
    }
};
