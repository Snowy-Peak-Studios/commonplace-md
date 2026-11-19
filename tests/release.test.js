import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { yamlLoad } from '../vendor/vendor.js';

test('Pages publishes only public main and does not check out development source',()=>{
  const workflow=yamlLoad(fs.readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8'));
  assert.deepEqual(workflow.on.push.branches,['main']);
  assert.match(workflow.jobs.deploy.if,/github\.repository == 'Snowy-Peak-Studios\/commonplace-md'/);
  assert.match(workflow.jobs.deploy.if,/github\.ref == 'refs\/heads\/main'/);
  const checkouts=workflow.jobs.deploy.steps.filter(step=>step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkouts.length,1);
  assert.equal(checkouts[0].with?.ref,undefined);
});

test('retired preview worker isolates its cache and clients even under a project subpath',async()=>{
  const listeners={},deleted=[],navigated=[];let unregistered=false;
  const scope='https://example.test/app/dev/';
  const context={URL,caches:{keys:async()=>['release /app/','preview /app/dev/','another /other/dev/'],delete:async key=>deleted.push(key)},self:{
    registration:{scope,unregister:async()=>{unregistered=true;}},
    addEventListener:(name,fn)=>{listeners[name]=fn;},skipWaiting:async()=>{},
    clients:{matchAll:async()=>[
      {url:scope+'#/notes/Home.md',navigate:async url=>navigated.push(url)},
      {url:'https://example.test/app/#/other',navigate:async()=>assert.fail('release client changed')},
      {url:'https://else.test/app/dev/',navigate:async()=>assert.fail('foreign client changed')}
    ]}
  }};
  vm.runInNewContext(fs.readFileSync(new URL('../tools/retired-dev/sw.js',import.meta.url),'utf8'),context);
  let activation;listeners.activate({waitUntil:promise=>{activation=promise;}});await activation;
  assert.deepEqual(deleted,['preview /app/dev/']);
  assert.deepEqual(navigated,['https://example.test/app/#/notes/Home.md']);
  assert(unregistered);
});
