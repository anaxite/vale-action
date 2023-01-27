import * as core from '@actions/core';

import fs from 'fs';
import path from 'path';

type Severity = 'suggestion' | 'warning' | 'error';

interface Alert {
  readonly Check: string;
  readonly Line: number;
  readonly Message: string;
  readonly Span: [number, number];
  readonly Severity: Severity;
}

interface ValeJSON {
  readonly [propName: string]: ReadonlyArray<Alert>;
}

/**
 * Create file annotations from Vale's JSON output.
 *
 * NOTE: There some size limitations (https://rb.gy/lpeyey) which require us to
 * only report the first 50.
 */
export async function annotate(output: string) {
  const alerts = JSON.parse(output) as ValeJSON;

  var alertsMap = new Map();
  for (const filename of Object.getOwnPropertyNames(alerts)) {
    for (const a of alerts[filename]) {
      if (alertsMap.has(a.Check)) {
        alertsMap.set(a.Check, alertsMap.get(a.Check) + 1);
      } else {
        alertsMap.set(a.Check, 1);
      }
      const msg = `[${a.Check}] ${a.Message}`;
      const annotation = `file=${filename},line=${a.Line},col=${a.Span[0]}::${msg}`;
      switch (a.Severity) {
        case 'suggestion':
          core.info(`::notice ${annotation}`);
          break;
        case 'warning':
          core.info(`::warning ${annotation}`);
          break;
        default:
          core.info(`::error ${annotation}`);
          break;
      }
    }
  }

  var chart = 'pie title Annotations by rule';
  for (let [key, value] of alertsMap) {
    chart += `\n"${key}" : ${value}`;
  }

  await core.summary
    .addHeading('Test Results')
    .addTable([
      [
        {data: 'File', header: true},
        {data: 'Result', header: true}
      ],
      ['foo.js', 'Pass ✅'],
      ['bar.js', 'Fail ❌'],
      ['test.js', 'Pass ✅']
    ])
    /*
    .addCodeBlock(
      `pie title Annotations by rule
"Dogs" : 386
"Cats" : 85
"Rats" : 15`,
      'mermaid'
    )*/
    .addCodeBlock(chart, 'mermaid')
    .write();
}
