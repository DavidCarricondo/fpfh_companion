import { steps as allSteps } from '../../content'
import { derivedFlags, phaseProgress, stepsForPhases } from '../../engine/steps'
import type { StepPhase } from '../../engine/types'
import { emptyProgress, progressKey, useAppStore } from '../../store/campaign'
import type { Campaign } from '../../store/types'

/** Progreso del turno y flags efectivos (manuales + derivados de ajustes y turno). */
export function useTurnFlags(campaign: Campaign, turn: number) {
  const progress =
    useAppStore((s) => s.progress[progressKey(campaign.id, turn)]) ?? emptyProgress(campaign.id, turn)
  const flags = {
    ...progress.flags,
    ...derivedFlags({
      turn,
      storyTrack: campaign.settings.storyTrack,
      battleEvents: campaign.settings.battleEvents,
      hasVictoryCondition: !!campaign.settings.victory?.trim(),
    }),
  }
  return { progress, flags }
}

export function useProgress(campaign: Campaign, turn: number, phases: readonly StepPhase[]) {
  const { progress, flags } = useTurnFlags(campaign, turn)
  return phaseProgress(stepsForPhases(allSteps, phases), flags, progress.checked, {
    crewSize: campaign.settings.crewSize,
  })
}
