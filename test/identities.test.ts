import test from 'node:test';
import assert from 'node:assert/strict';
import { collectIdentityIds, identityLabel } from '../lib/identities';
test('finds identities in payments, gifts and nested audit snapshots without duplicates', () => {
 const actor='11111111-1111-4111-8111-111111111111',player='22222222-2222-4222-8222-222222222222';
 assert.deepEqual(collectIdentityIds({rows:[{user_id:player},{actor_id:actor,before_value:{recipient_id:player}}]}),[player,actor]);
 assert.deepEqual(collectIdentityIds({details:'not a uuid',count:12}),[]);
});
test('identity collection is bounded',()=>{
 const ids=Array.from({length:1001},(_,i)=>`${i.toString(16).padStart(8,'0')}-1111-4111-8111-111111111111`);
 assert.equal(collectIdentityIds(ids).length,1000);
});
test('labels identify the actual player and handle missing email explicitly',()=>{
 assert.equal(identityLabel({id:'test',username:'Tan',email:'test@example.com',player_tag:'Tan'}),'Tan · test@example.com');
 assert.match(identityLabel({id:'deleted',username:null,email:null,player_tag:'Tag'}),/^Tag · E-mail indisponible$/);
});
