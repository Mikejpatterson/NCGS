# Rehearsal copy: steps for the owner

These steps give the 20-phone rehearsal (`tools/rehearsal.js`) its own separate copy of the server to play against. It is a new, empty Apps Script project and spreadsheet. It runs the **same uploaded server file** as the live app, but it never sees or changes the real sheet.

The building session takes the owner through these **one step at a time**, waiting for a reply or screenshot after each. Do them after the Drive upload for fixes 2 and 4 (and fix 6).

**Pick a quiet time.** Not during a round, and not when people are checking results. Google allows 30 server requests at once per account, and the rehearsal shares that limit with the live app.

## Steps

1. **Open a new script project.** Go to script.google.com and click **New project** (top left).
   *You should see:* an editor titled "Untitled project", with a file `Code.gs` containing `function myFunction() {}`.

2. **Name it.** Click "Untitled project" at the top and type `NCGS REHEARSAL – delete after`, then **Rename**.

3. **Paste the code.** In `Code.gs`, select everything and delete it. Paste the text the building session sends. That text is `dist/bootstrap.gs` with the **same** server file ID as the live project, plus this one extra line:
   ```js
   function useRehearsalSheet(){var s=SpreadsheetApp.create('NCGS REHEARSAL – delete after');PropertiesService.getScriptProperties().setProperty('SHEET',s.getId());Logger.log(s.getUrl());}
   ```
   Then press **Ctrl+S** (or **Cmd+S** on a Mac) to save.
   *You should see:* no orange dot beside `Code.gs`.

4. **Make the rehearsal spreadsheet.** In the drop-down next to **Run**, choose `useRehearsalSheet` and click **Run**. Google will ask for permission:
   - Click **Review permissions** and choose the account.
   - If you see "Google hasn't verified this app", click **Advanced**, then **Go to NCGS REHEARSAL (unsafe)**, then **Allow**. It is your own script.
   *You should see:* "Execution completed" in the log at the bottom, and a link to a new spreadsheet called "NCGS REHEARSAL – delete after". Send a screenshot.

5. **Publish it.** Click **Deploy**, then **New deployment**, then the gear icon beside "Select type", then **Web app**. Set:
   - Description: `rehearsal`
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy**, then **Copy** under "Web app URL" (it ends in `/exec`). Send that address to the building session. **Don't post it anywhere public.**

6. **Let the reviewer reach Google.** The review session's network settings block Google's script servers. In the reviewer session's title bar, open the cloud environment menu and choose **Edit**, then **Network access**. Add these two domains under Allowed domains, and leave **Allow package managers** ticked:
   - `script.google.com`
   - `script.googleusercontent.com`

   The steps are at https://code.claude.com/docs/en/cloud-environments#network-access.

7. **Nothing to do while it runs.** The reviewer runs:
   ```
   node tools/rehearsal.js --api <the /exec address> --pin 1234 --setup-fixture --minutes 120 --speed 2
   ```
   That is 20 phones playing a round at twice the normal pace, so double the real load, for about an hour.
   - The tool **stops without changing anything** if the address holds any player who is not one of the invented test players. It cannot touch the real data, even if the wrong address were pasted.
   - `1234` is the default PIN of a brand-new project; the copy has no PIN of its own.

8. **Clean up afterwards.**
   - In the rehearsal project, click **Deploy**, then **Manage deployments**, then **Archive**.
   - In Google Drive, put the spreadsheet **NCGS REHEARSAL – delete after** and the project **NCGS REHEARSAL – delete after** in the bin.
   - **Never** touch "NCGS data" or the live script project.

## What a pass looks like

- All five checks say PASS: every score arrived, none changed or doubled, every clash refused, repeated saves wrote nothing, and the round went live.
- No `server` errors.
- 95% of responses arrive in under about 3 s.

The result goes on the review branch. Fix 2 counts as done only after this passes.
