import { chromium } from '@playwright/test';
import fs from 'fs';
const out='tests/e2e/manual-artifacts'; fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({headless:true}); const p=await b.newPage({viewport:{width:1280,height:900}}); const rows=[];
async function shot(n){await p.screenshot({path:`${out}/${n}.png`,fullPage:true});}
async function fill(u,e,pw,cp){await p.goto('http://localhost:3000/register'); await p.getByTestId('register-username').fill(u); await p.getByTestId('register-email').fill(e); await p.getByTestId('register-password').fill(pw); await p.getByTestId('register-confirm').fill(cp); await p.getByTestId('register-submit').click(); await p.waitForTimeout(800);}
await p.goto('http://localhost:3000/login'); await shot('01-login.png'); rows.push(['登录页可访问',p.url().includes('/login'),'']);
await p.goto('http://localhost:3000/register'); await shot('02-register.png'); rows.push(['注册页可访问',p.url().includes('/register'),'']);
await p.getByTestId('register-username').fill('testuser'+Date.now()); await p.getByTestId('register-submit').click(); await p.waitForTimeout(300); await shot('03-empty-email.png'); rows.push(['邮箱不能为空',await p.locator('.ant-form-item-explain-error').count()>0,'应阻止提交并提示']);
await p.getByTestId('register-email').fill('valid@example.com'); await p.getByTestId('register-password').fill('12345'); await p.getByTestId('register-confirm').fill('12345'); await p.getByTestId('register-submit').click(); await p.waitForTimeout(300); await shot('04-short-password.png'); rows.push(['密码少于8位应拒绝',await p.locator('.ant-form-item-explain-error').count()>0,'实际前端规则min=6，5位会拒绝但6-7位可通过']);
const user='e2e'+Date.now(), email=user+'@example.com', pass='Passw0rd!'; await fill(user,email,pass,pass); await shot('05-register-result.png'); const regok=p.url().includes('/login'); rows.push(['正常注册后回登录',regok,p.url()]);
if(regok){await p.getByTestId('login-email').fill(email).catch(async()=>await p.locator('input').nth(0).fill(email)); await p.getByTestId('login-password').fill(pass).catch(async()=>await p.locator('input[type=password]').fill(pass)); await p.getByTestId('login-submit').click().catch(async()=>await p.locator('button[type=submit]').click()); await p.waitForTimeout(800); await shot('06-login-result.png'); rows.push(['注册账号可登录',!p.url().includes('/login'),p.url()]);}
fs.writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2)); await b.close();
