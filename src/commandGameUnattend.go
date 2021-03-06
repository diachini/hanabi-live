/*
	Sent when the user clicks on the "Lobby" button while they are in the middle of a game
	"data" is empty
*/

package main

import (
	"strconv"
)

func commandGameUnattend(s *Session, d *CommandData) {
	// Set their status
	oldStatus := s.Status()
	s.Set("status", statusLobby)
	gameID := s.CurrentGame()
	s.Set("currentGame", -1)
	notifyAllUser(s)

	// Validate that the game exists
	if gameID == -1 {
		// The user may be returning from a replay that was ended due to idleness,
		// or perhaps they lagged and sent two gameUnattend messages,
		// with this one being the second one
		log.Info("User \"" + s.Username() + "\" tried to unattend, " +
			"but their game ID was set to -1.")
		return
	}
	var g *Game
	if v, ok := games[gameID]; !ok {
		s.Error("Game " + strconv.Itoa(gameID) + " does not exist, so you cannot unattend it.")
		return
	} else {
		g = v
	}

	// Check to see if they are a spectator
	if oldStatus == statusSpectating ||
		oldStatus == statusReplay ||
		oldStatus == statusSharedReplay {

		// Check to see if they are in the spectators list
		i := g.GetSpectatorIndex(s.UserID())
		if i == -1 {
			s.Error("You are not in the spectators list, " +
				"even though you were marked as having status \"" + status[oldStatus] + "\" " +
				"in replay " + strconv.Itoa(gameID) + ".")
			return
		}

		// Remove them from the slice
		g.Spectators = append(g.Spectators[:i], g.Spectators[i+1:]...)
		notifyAllTable(g)    // Update the spectator list for the row in the lobby
		g.NotifySpectators() // Update the in-game spectator list

		if g.Replay {
			if len(g.Spectators) == 0 {
				// This was the last person to leave the replay, so delete it
				log.Info("Ended replay #" + strconv.Itoa(gameID) + " because everyone left.")
				delete(games, gameID)

				// Notify everyone that the table was deleted
				notifyAllTableGone(g)
			}
		}

		return
	}

	// Set their "present" variable to false, which will turn their name red
	// (or set them to "AWAY" if the game has not started yet)
	i := g.GetPlayerIndex(s.UserID())
	if i == -1 {
		s.Error("You are not in game " + strconv.Itoa(gameID) + ", so you cannot unattend it.")
		return
	}
	p := g.Players[i]
	p.Present = false

	if g.Running {
		g.NotifyConnected()
	} else {
		g.NotifyPlayerChange()
	}

	// They got sent a "tableGone" message earlier (if the game started),
	// so send them a new table message
	s.NotifyTable(g)
}
