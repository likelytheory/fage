import * as Fage from '../';

Fage.error.badrequest({message: '400'});
Fage.error.conflict({message: '409'});
Fage.error.fatal({message: '500'});
Fage.error.forbidden({message: '403'});
Fage.error.notfound({message: '404'});
Fage.error.ratelimit({message: '423'});
Fage.error.unauthorized({message: '401'});
Fage.error.unavailable({message: '501'});

Fage.run({
  path: 'demo',
  onError: (err) => {},
  ref: {oh: 'hi'},
  fns: [
    () => {}
  ]
});

const mb: Fage.MethodBlock = {
  path: 'go',
  fns: [
    ctx => {
      return ctx.input;
    }
  ]
};

Fage.compose([
  () => {}
]);

Fage([mb, {path: 'junk', fns: [() => 'derp']}]);
