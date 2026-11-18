import type { JSHandle } from '@playwright/test';
import type { DeskState, DeskTestApi } from '../deskApi';

/** Reads the state through the test API, so specs never depend on where the refactor moves the app variables. */
export const readDeskState = (desk: JSHandle<DeskTestApi>): Promise<DeskState> => desk.evaluate((d) => d.state());
