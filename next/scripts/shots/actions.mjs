// The click steps of shoot.mjs: each opens a dialog, a menu, a panel or a wizard step and captures
// it. None saves: every button that writes stays unpressed, and the stub in shoot.mjs answers any
// write a click makes. A step takes its page from SHOTS_ACT as step=/route; a step whose page holds
// an id has no default.
export function actions({ open, capture }) {
  const shut = async (page) => { await page.keyboard.press('Escape').catch(() => {}); await page.close(); };
  const need = (step, route, example) => {
    if (!route) throw new Error(`${step} needs its page: SHOTS_ACT=${step}=${example}`);
    return route;
  };

  // The Report result and the Schedule buttons of a series page's action bar
  const seriesDialog = (step, button, name, note) => async (route) => {
    need(step, route, '/series/<id>');
    const page = await open(route);
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForTimeout(2500);
    await capture(page, name, route, { fullPage: false, note });
    await shut(page);
  };

  return {
    async draft(route) {
      need('draft', route, '/match/<id>');
      const page = await open(route);
      // only a viewer who may plan sees the Plan round tab
      const planTab = page.getByRole('tab', { name: 'Plan round' });
      await planTab.waitFor({ timeout: 20000 }).catch(() => {});
      if (!(await planTab.count())) {
        await capture(page, 'dialog-plan-round', route, { note: 'no Plan round tab: this viewer cannot plan the match' });
        return page.close();
      }
      // opening the Plan round tab writes the team's seen mark; the stub answers that write
      await planTab.click();
      // the planner opens on Draft when drafts exist, so go to Who plays, which lists every player
      const whoTab = page.getByRole('tab', { name: 'Who plays' });
      await whoTab.waitFor({ timeout: 20000 }).catch(() => {});
      if (await whoTab.count()) await whoTab.click();
      await page.waitForTimeout(1500);
      // the banner names team 1 first; its Who plays list is the one under that name
      const team1 = (await page.locator('h2 .team-name .name').first().innerText().catch(() => '')).trim();
      const lists = page.locator('#round-planner div.min-w-0:has(> ul)');
      const list1 = team1 ? lists.filter({ has: page.locator('.team-name').getByText(team1, { exact: true }) }) : lists;
      const item = ((await list1.count()) ? list1 : lists).first().getByRole('listitem').first();
      const toggle = item.getByRole('switch');
      if (!(await toggle.count())) {
        await capture(page, 'dialog-plan-round', route, { note: 'Plan round tab; Who plays drew no player rows, so no panel was opened' });
        return page.close();
      }
      const name = ((await toggle.getAttribute('aria-label')) || '').replace(/ (plays round|is in your list)$/, '');
      // the flag inside the name carries its own tooltip and keeps the click, so press the name text
      await item.getByRole('button', { name }).getByText(name, { exact: true }).first().click();
      await page.waitForTimeout(2500);
      const panel = (await page.getByRole('dialog', { name: `${name}: stats` }).count()) > 0;
      console.log('draft: panel open:', panel);
      await capture(page, 'dialog-plan-round', route, { note: `Plan round tab, Who plays, clicked team 1 player ${name}; stats panel open: ${panel}` });
      await page.close();
    },

    async cast(route) {
      need('cast', route, '/series/<id>');
      const page = await open(route);
      const chip = page.getByRole('button', { name: 'Cast this', exact: true });
      if (!(await chip.count())) { console.log('cast: no Cast this chip on the page'); return page.close(); }
      await chip.click();
      await page.waitForTimeout(2000);
      await capture(page, 'dialog-cast', route, { fullPage: false, note: 'Cast claim dialog from the Cast this chip; Cast series never pressed' });
      await shut(page);
    },

    async kothcard(route) {
      need('kothcard', route, '/koth/nights/<id>');
      const page = await open(route);
      const box = await page.evaluate(() => {
        const mark = [...document.querySelectorAll('div')].find((el) => /^(Held the throne at the end|Holds the throne|No king recorded)$/.test(el.innerText.trim()));
        const card = mark?.closest('.card');
        if (!card) return null;
        card.scrollIntoView({ block: 'start' });
        const r = card.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height, pageW: document.documentElement.scrollWidth };
      });
      if (!box) { console.log('kothcard: no bracket card on the page'); return page.close(); }
      await page.waitForTimeout(500);
      const pad = 16;
      const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
      const clip = { x, y, width: Math.min(box.pageW - x, box.width + 2 * pad), height: box.height + 2 * pad };
      await capture(page, 'koth-bracket-card', route, { clip, note: 'First bracket card, clipped with 16 px around it' });
      await page.close();
    },

    report: seriesDialog('report', 'Report result', 'dialog-report-result', 'Report result dialog from the series action bar; not submitted'),
    schedule: seriesDialog('schedule', 'Schedule', 'dialog-schedule', 'Schedule dialog from the series action bar; not saved'),

    async signup(route = '/signup') {
      const page = await open(route);
      const edit = page.getByRole('button', { name: 'Change my details', exact: true });
      if (await edit.count()) { await edit.click(); await page.waitForTimeout(1000); }
      await capture(page, 'dialog-signup-form', route, { note: 'Season signup form (Change my details opens it for a signed-up player); not submitted' });
      await page.close();
    },

    async wizard(route = '/events/new') {
      const page = await open(route);
      await page.getByLabel('Name', { exact: true }).fill('Sample cup');
      await page.getByLabel('League', { exact: true }).click();
      await page.waitForTimeout(500);
      await page.getByRole('option').first().click();
      await page.waitForTimeout(1500);
      for (let i = 1; i <= 10; i++) {
        // the header reads "Step n of m · Title"
        const stepText = await page.locator('text=/Step \\d+ of \\d+/').first().innerText().catch(() => '');
        const title = (stepText.split('·')[1] || `step-${i}`).trim().toLowerCase().replace(/\W+/g, '-');
        await capture(page, `dialog-wizard-${i}-${title}`, route, { note: `Event wizard ${stepText || 'step ' + i}; Create event never pressed` });
        const next = page.getByRole('button', { name: 'Next', exact: true });
        if (!(await next.count())) break; // the last step offers Create event, which is never pressed
        if (await next.isDisabled()) { console.log('wizard: Next disabled on step', i); break; }
        await next.click();
        await page.waitForTimeout(1200);
      }
      await page.close();
    },

    async viewas(route = '/') {
      const page = await open(route);
      await page.locator('button[aria-label^="Account menu"]').click();
      await page.waitForTimeout(800);
      await capture(page, 'dialog-account-menu', route, { fullPage: false, note: 'Account menu from the app bar' });
      await page.getByRole('menuitem', { name: /View as/ }).click();
      await page.waitForTimeout(1500);
      await capture(page, 'dialog-view-as', route, { fullPage: false, note: 'View as dialog; View never pressed' });
      await shut(page);
    },

    async theme(route = '/') {
      const page = await open(route);
      await page.locator('button[aria-label="Theme"]').click();
      await page.waitForTimeout(800);
      await capture(page, 'dialog-theme-menu', route, { fullPage: false, note: 'Theme menu from the app bar; no item chosen' });
      await shut(page);
    },

    // run with SHOTS_PHONE=1: the tab bar at the bottom, the My Team picker and the account menu
    async phonenav(route = '/') {
      const page = await open(route);
      await capture(page, 'dialog-phone-nav', route, { fullPage: false, note: 'Bottom tab bar, the phone navigation' });
      const picker = page.locator('nav[aria-label="Main"] button:visible');
      if (await picker.count()) {
        await picker.first().click();
        await page.waitForTimeout(1000);
        await capture(page, 'dialog-phone-team-picker', route, { fullPage: false, note: 'My Team picker sheet' });
        await page.keyboard.press('Escape');
      } else console.log('phonenav: no picker in the tab bar; My Team is a plain link for this user');
      await page.locator('button[aria-label^="Account menu"]').click();
      await page.waitForTimeout(800);
      await capture(page, 'dialog-phone-account-menu', route, { fullPage: false, note: 'Account menu on the phone' });
      await shut(page);
    },
  };
}
