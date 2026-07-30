/**
 * Classic mode — the original "listen → reveal → self-score" flow.
 * Reuses the existing Playing + Revealed components unchanged; it just owns the
 * play→reveal sub-state and reports the score through the RoundProps contract.
 */

import { useState } from "react";

import { Playing } from "@/components/game/Playing";
import { Revealed } from "@/components/game/Revealed";
import type { RoundProps } from "./types";

export function ClassicRound({ songs, player, round, onResult }: RoundProps) {
  const song = songs[0];
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <Playing
        round={round}
        player={player}
        song={song}
        onReveal={() => setRevealed(true)}
      />
    );
  }

  return (
    <Revealed
      player={player}
      song={song}
      onScore={(correct) => onResult({ correct, points: correct ? 1 : 0 })}
    />
  );
}
