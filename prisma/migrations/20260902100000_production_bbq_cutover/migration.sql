-- Production BBQ cutover: public requests no longer promise a physical table
-- or deposit. A persisted service-boundary end time remains for legacy admin
-- records; daily quota is protected by a transaction advisory lock in service.
ALTER TABLE "bbq_menu_items"
  DROP CONSTRAINT "bbq_menu_items_group_check";

ALTER TABLE "bbq_menu_items"
  ADD CONSTRAINT "bbq_menu_items_group_check"
  CHECK ("menu_group" IN ('GOI_SALAD_KHAI_VI', 'RAU_MON_AN_NHE', 'MON_NUONG', 'MON_LAU', 'SOT_CHAM', 'DO_UONG'));
