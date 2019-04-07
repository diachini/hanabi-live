/*
    Speedrun click functions for the HanabiCard object
*/

// Imports
const constants = require('../../constants');
const globals = require('./globals');
const notes = require('./notes');

module.exports = function clickSpeedrun(event) {
    if (
        // Speedrunning overrides the normal card clicking behavior
        // (but don't use the speedrunning behavior if
        // we are in a solo replay / shared replay / spectating)
        (!globals.speedrun || globals.replay || globals.spectating)
        // Disable all click events if the card is tweening from the deck to the hand
        // (the second condition looks to see if it is the first card in the hand)
        || (this.tweening && this.parent.index === this.parent.parent.children.length - 1)
        || this.isPlayed // Do nothing if we accidentally clicked on a played card
        || this.isDiscarded // Do nothing if we accidentally clicked on a discarded card
    ) {
        return;
    }

    if (event.evt.which === 1) { // Left-click
        clickSpeedrunLeft(this, event.evt);
    } else if (event.evt.which === 3) { // Right-click
        clickSpeedrunRight(this, event.evt);
    }
};

const clickSpeedrunLeft = (card, event) => {
    // Left-clicking on cards in our own hand is a play action
    if (
        card.holder === globals.playerUs
        && !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
    ) {
        globals.lobby.ui.endTurn({
            type: 'action',
            data: {
                type: constants.ACT.PLAY,
                target: card.order,
            },
        });
        return;
    }

    // Left-clicking on cards in other people's hands is a color clue action
    // (but if we are holding Ctrl, then we are using Empathy)
    if (
        card.holder !== globals.playerUs
        && globals.clues !== 0
        && !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
    ) {
        globals.preCluedCard = card.order;

        // A card may be cluable by more than one color,
        // so we need to figure out which color to use
        const clueButton = globals.elements.clueTypeButtonGroup.getPressed();
        const cardColors = card.trueSuit.clueColors;
        let color;
        if (
            // If a clue type button is selected
            clueButton
            // If a color clue type button is selected
            && clueButton.clue.type === constants.CLUE_TYPE.COLOR
            // If the selected color clue is actually one of the possibilies for the card
            && cardColors.findIndex(cardColor => cardColor === clueButton.clue.value) !== -1
        ) {
            // Use the color of the currently selected button
            color = clueButton.clue.value;
        } else {
            // Otherwise, just use the first possible color
            // e.g. for rainbow cards, use blue
            [color] = cardColors;
        }

        const value = globals.variant.clueColors.findIndex(
            variantColor => variantColor === color,
        );
        globals.lobby.ui.endTurn({
            type: 'action',
            data: {
                type: constants.ACT.CLUE,
                target: card.holder,
                clue: {
                    type: constants.CLUE_TYPE.COLOR,
                    value,
                },
            },
        });
    }
};

const clickSpeedrunRight = (card, event) => {
    // Right-clicking on cards in our own hand is a discard action
    if (
        card.holder === globals.playerUs
        && !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
    ) {
        // Prevent discarding while at 8 clues
        if (globals.clues === 8) {
            return;
        }
        globals.lobby.ui.endTurn({
            type: 'action',
            data: {
                type: constants.ACT.DISCARD,
                target: card.order,
            },
        });
        return;
    }

    // Right-clicking on cards in other people's hands is a number clue action
    if (
        card.holder !== globals.playerUs
        && globals.clues !== 0
        && !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
    ) {
        globals.preCluedCard = card.order;
        globals.lobby.ui.endTurn({
            type: 'action',
            data: {
                type: constants.ACT.CLUE,
                target: card.holder,
                clue: {
                    type: constants.CLUE_TYPE.RANK,
                    value: card.trueRank,
                },
            },
        });
        return;
    }

    // Ctrl + right-click is the normal note popup
    if (
        event.ctrlKey
        && !event.shiftKey
        && !event.altKey
        && !event.metaKey
    ) {
        notes.openEditTooltip(card);
        return;
    }

    // Shift + right-click is a "f" note
    // (this is a common abbreviation for "this card is Finessed")
    if (
        !event.ctrlKey
        && event.shiftKey
        && !event.altKey
        && !event.metaKey
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
    ) {
        card.setNote('cm');
    }
};
