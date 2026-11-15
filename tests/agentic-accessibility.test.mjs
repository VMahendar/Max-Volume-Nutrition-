import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('visible price dropdown has accessible name even when its visual label is hidden on mobile',()=>{
  for(const path of ['index.html','public/index.html']){
    const html=readFileSync(path,'utf8');
    assert.match(html,/<select\s+id="priceRange"\s+aria-label="Filter products by retail price"/,path+' must name the filter');
  }
});

test('small retail captions maintain sufficient contrast on dark and light sections',()=>{
  for(const path of ['mvn-fitness-retail.css','public/mvn-fitness-retail.css']){
    const css=readFileSync(path,'utf8');
    assert.ok(css.includes('color: #d5dce3 !important;'),path+' dark caption contrast missing');
    assert.ok(css.includes('color: #74513c !important;'),path+' light category caption contrast missing');
  }
});
