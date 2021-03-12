Try it out at https://atennapel.github.io/coc-os

Elaboration for a dependently typed language with simple universes.

Install:
```
yarn install
```

Run CLI REPL:
```
yarn start
```

Typecheck file:
```
yarn start filename
```

```
TODO:
- projection
- equality type
- fixpoints
- universe elaboration
INVESTIGATE:
- (b : Bool) ** (if^ b () Bool) -- should this typecheck? shouldn't b be lifted?
```
