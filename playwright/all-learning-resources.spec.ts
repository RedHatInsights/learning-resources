import {test} from '@playwright/test';


  test('appears in the help menu and the link works', async({page}) => {
	  await page.goto('https://console.stage.redhat.com');
  });


