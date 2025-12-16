import { create } from "zustand";
import type { LeagueState } from "../engine/types/league";
import type { Action } from "../engine/actions/types";
import { reducer } from "../engine/reducer/reducer";

type LeagueStore = {
  state: LeagueState | null;
  dispatch: (action: Action) => void;
};

export const useLeagueStore = create<LeagueStore>((set, get) => ({
  state: null,

  dispatch: (action) => {
    const current = get().state;

    if (!current && action.type !== "NEW_LEAGUE") {
      console.warn("No league loaded");
      return;
    }

    const next = reducer(current as LeagueState, action);
    set({ state: next });
  },
}));
