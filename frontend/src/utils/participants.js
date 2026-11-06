// Present = VIP who has checked in, or someone who registered on site via QR.
// Matches the eligibility rule in the draw_winner database function.
export const isPresent = (p) => !!p.checked_in || !p.is_pre_registered;
