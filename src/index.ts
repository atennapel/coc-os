console.log(42);

/**
TODO:
- pi parser
- let parser
- implicit functions

PROBLEMS:

:d
:opq Nat /(t:*) t (/t.t). t
:def toNat ~Nat (\x. /x. Nat) (\x.x)
:def fromNat ~Nat (\x.x)
:def z toNat (\t z s. z)
:def s \n. toNat (\t z s. s (fromNat n t z s)) : /Nat.Nat
\(Nat:*) x. s x

\(t:*)(n:Nat). /(r:/Nat. *) (nil : r z) (cons : /(m:Nat)(head:t)(tail:r m). r (s m)). r n

*/
