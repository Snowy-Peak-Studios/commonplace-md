import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overviewOptions, overviewPath, sourceKey, resolveOverviewSource, overviewSource, overviewBlock, overviewContents, writeOverviewNote, overviewCaptures, overviewRows, overviewEach } from '../src/inbox-overview.js';
import { taskSetup, assignmentTasks, findMentions, mentionKey } from '../src/vault.js';
import { noteProps } from '../src/bases.js';
import { upgradeInboxOverview, migrateInboxOverview } from '../src/store.js';

const source = { kind:'github',owner:'alpha-example',repo:'journal',branch:'main',folder:'Wiki',inbox:'Inbox.md',person:'Ana Lee',login:'ana-example' };
const options = (sources=[source], extra={}) => ({context:'Personal',show:['reviews','questions','assignments','mentions','new-tasks'],refresh:'manual',limit:50,reviewStatuses:['Testing'],sources,...extra});
const parse = o => overviewOptions(overviewContents(overviewBlock(o))[0]);
const note = (path,text,sha='1') => ({path,text,sha,props:noteProps(text)});
const task = (name,props,body='') => note('Work/'+name+'.md', '---\n'+Object.entries(props).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')+'\n---\n'+body);

test('overview defaults are explicit and an empty source list reads none',()=>{
 const o=overviewOptions('');assert.deepEqual(o.sources,[]);assert.equal(o.refresh,'manual');assert.equal(o.limit,50);assert(o.defaults.includes('show'));assert.deepEqual(o.reviewStatuses,['Testing']);
 assert.deepEqual(parse(options()).sources,[source]);
 for(const s of ['sources: https://example.com','refresh: every-minute','limit: 0','show: [unknown]','token: secret','sources:\n- kind: github\n  token: secret'])assert.throws(()=>overviewOptions(s));
 for(const path of ['../Inbox.md','/Inbox.md','C:/Inbox.md','Notes/.hidden.md','a//b.md'])assert.throws(()=>overviewPath(path));
 assert.equal(overviewPath('Notes\\Inbox.md'),'Notes/Inbox.md');
 assert.throws(()=>parse(options([source,source])),/once/);
});

test('source binding requires exact storage, branch, folder and local ID without discovering substitutes',()=>{
 const r={id:'a',owner:source.owner.toUpperCase(),repo:source.repo,branch:'main',folder:'Wiki'};
 const b={...r,id:'b',branch:'draft'},c={...r,id:'c',folder:'Other'};
 assert.equal(resolveOverviewSource(source,[b,c,r]),r);
 assert.throws(()=>resolveOverviewSource(source,[b,c]),/not configured/);
 assert.throws(()=>resolveOverviewSource(source,[r,{...r,id:'duplicate'}]),/ambiguous/);
 assert.notEqual(sourceKey(source),sourceKey({...source,branch:'draft'}));
 assert.notEqual(sourceKey(source),sourceKey({...source,folder:'Other'}));
 const local={id:'private-id',label:'Same label',local:'browser',inbox:'Inbox.md'};
 const s=overviewSource(local,{person:'Ana Lee'});assert.equal(resolveOverviewSource(s,[local]),local);
 assert.throws(()=>resolveOverviewSource(s,[{...local,id:'another-id'}]));
 assert.throws(()=>resolveOverviewSource({...s,kind:'folder'},[local]));
});

test('setup preserves unrelated note text and ignores blocks inside documentation fences',()=>{
 const example='````markdown\n```inbox-overview\ncontext: Example\n```\n````\n';
 const original='# Dashboard\n\n'+example+'\nPrivate prose.\n'+overviewBlock(options());
 const changed=writeOverviewNote(original,options([], {context:'Family'}));
 assert(changed.startsWith('# Dashboard\n\n'+example));assert(changed.includes('Private prose.'));assert.equal(overviewContents(changed).length,1);assert.equal(overviewOptions(overviewContents(changed)[0]).context,'Family');
 assert.throws(()=>writeOverviewNote(overviewBlock(options())+overviewBlock(options()),options()),/one overview/);
 assert.throws(()=>writeOverviewNote('```inbox-overview\ncontext: incomplete',options()),/Close/);
});

test('owned captures skip code examples and other people while retaining duplicate item identities and EOF fences',()=>{
 const text='---\nowner: Someone else\n---\n````markdown\n```new-tasks\nowner: Ana Lee\nFake item\n```\n````\n```description\n```new-tasks\nowner: Ana Lee\nSame\nSame\n```\n```\n```new-tasks\nowner: Other\nWrong\n```\n~~~new-tasks\nowner: Ana Lee\nLast';
 const found=overviewCaptures(text,'ana lee');assert.deepEqual(found.map(x=>x.text),['Same','Same','Last']);assert.notEqual(found[0].occurrence,found[1].occurrence);assert.notEqual(found[0].block,found[2].block);
});

test('custom task fields, review precedence, questions, Seen and source-local identities determine rows',()=>{
 const setup=taskSetup({folder:'Work',fields:{status:{prop:'state',values:['To Do','In Progress','Testing','Done']},reviewer:{on:true,prop:'checker'},assignee:{prop:'worker'},requested_by:{prop:'requester'}}});
 const notes=[task('Review',{id:'N-1',state:'Testing',checker:'Ana Lee',worker:'Ana Lee',question:'Approve?'}),task('Other',{id:'N-2',state:'Testing',checker:'Other',worker:'Other'}),task('Assigned',{id:'N-3',state:'To Do',worker:'Ana Lee'}),task('Question',{id:'N-4',state:'To Do',requester:'Ana Lee',question:'Which?'}),task('Done',{state:'Done',checker:'Ana Lee',question:'Old?'}),note('Notes.md','# Notes\n@ana-example Please read\n\n```new-tasks\nowner: Ana Lee\nSame\nSame\n```')];
 let rows=overviewRows({notes,setup,source,options:options()});
 assert.equal(rows.filter(r=>r.kind==='reviews').length,1);assert.equal(rows.filter(r=>r.path==='Work/Review.md').length,1);assert.equal(rows.filter(r=>r.kind==='questions').length,1);assert.equal(rows.filter(r=>r.kind==='mentions').length,1);assert.equal(rows.filter(r=>r.kind==='new-tasks').length,2);assert.equal(new Set(rows.map(r=>r.key)).size,rows.length);
 const seen_assignments=assignmentTasks(notes,setup,{name:'Ana Lee',login:source.login}).map(t=>t.key);
 const mentions=findMentions(notes.at(-1).text).map(m=>({...m,path:'Notes.md'}));
 rows=overviewRows({notes,setup,source,options:options(),inboxProps:{seen_assignments,seen_mentions:mentions.map(m=>mentionKey(m.path,m))}});
 assert(!rows.some(r=>r.kind==='assignments'||r.kind==='mentions'));assert(rows.some(r=>r.kind==='reviews'));
 const other=overviewRows({notes,setup,source:{...source,branch:'draft'},options:options()});assert.notEqual(rows[0].key,other[0].key);
 const revised=overviewRows({notes:notes.map(n=>({...n,sha:'2'})),setup,source,options:options()});assert.notEqual(revised.find(r=>r.kind==='new-tasks').key,overviewRows({notes,setup,source,options:options()}).find(r=>r.kind==='new-tasks').key);
});

test('source workers have bounded concurrency and stop starting reads after invalidation',async()=>{
 let active=0,max=0,started=0,current=true;
 await overviewEach([1,2,3,4,5,6],3,async()=>{active++;started++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));current=false;active--;},()=>current);
 assert.equal(max,3);assert.equal(started,3);
});

test('overview preference migration never enables missing, legacy or malformed settings',()=>{
 const valid={version:1,enabled:true,repo:'private-dashboard',path:'Notes/Inbox.md'};assert.deepEqual(upgradeInboxOverview(valid),valid);
 for(const value of [null,true,{enabled:true},{...valid,enabled:'true'},{...valid,path:'../Inbox.md'},{...valid,path:'https://example.com/a.md'}])assert.equal(upgradeInboxOverview(value).enabled,false);
 const m=new Map([['commonplace:inboxOverview','{"enabled":true}'],['other','keep']]);const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 assert.equal(migrateInboxOverview(storage),true);assert.equal(JSON.parse(m.get('commonplace:inboxOverview')).enabled,false);assert.equal(migrateInboxOverview(storage),false);assert.equal(m.get('other'),'keep');
 assert.equal(migrateInboxOverview({getItem:()=>{throw Error('blocked')}}),false);
});
