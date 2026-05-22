import { AppSheetOverlays } from './AppSheetOverlays';
import { AppDialogOverlays } from './AppDialogOverlays';
import { AppUtilityOverlays } from './AppUtilityOverlays';
import { AppVisualStageOverlay } from './AppVisualStageOverlay';
export function AppPostMainOverlays(props) {
  return <><AppSheetOverlays {...props} /><AppDialogOverlays {...props} /><AppUtilityOverlays {...props} /><AppVisualStageOverlay {...props} /></>;
}
