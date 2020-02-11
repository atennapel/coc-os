-- mendler-style recursion, using a fixpoint type
def Fix = \(f : * -> *). fix (r : *). {x : *} -> ((r -> x) -> f r -> x) -> x

def fold : {f : * -> *} -> {x : *} -> ((Fix f -> x) -> f (Fix f) -> x) -> Fix f -> x
  = \{_ x} alg r. unroll r {x} alg
def inF : {f : * -> *} -> f (Fix f) -> Fix f
  = \x. roll \{t} alg. alg (fold {_} {t} alg) x
def outF : {f : * -> *} -> Fix f -> f (Fix f)
  = \{f} x. fold {f} {f (Fix f)} (\_ x. x) x

-- nats
def NatF = \(r : *). {t : *} -> t -> (r -> t) -> t
def Nat = Fix NatF
def Z : Nat = inF {NatF} \z s. z
def S : Nat -> Nat = \n. inF {NatF} \z s. s n

def caseNat : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \n z s. outF {NatF} n z s
def recNat : {t : *} -> Nat -> t -> ((Nat -> t) -> Nat -> t) -> t
  = \{t} n z s. fold {NatF} {t} (\rec m. m {t} z (\k. s rec k)) n

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t
  = \n z s. recNat n z (\rec m. s (rec m))

def pred : Nat -> Nat = \n. caseNat n Z (\n. n)

def add : Nat -> Nat -> Nat = \n m. foldNat n m S
def mul : Nat -> Nat -> Nat = \n m. foldNat n Z (add m)
def pow : Nat -> Nat -> Nat = \n m. foldNat m (S Z) (mul n)

def sub : Nat -> Nat -> Nat = \n m. foldNat m n pred

-- lists
def ListF = \(t : *) (r : *). {x : *} -> x -> (t -> r -> x) -> x
def List = \(t : *). Fix (ListF t)
def Nil : {t : *} -> List t = \{t}. inF {ListF t} \{x} n c. n
def Cons : {t : *} -> t -> List t -> List t = \{t} hd tl. inF {ListF t} \{x} n c. c hd tl

def caseList : {t r : *} -> List t -> r -> (t -> List t -> r) -> r
  = \{t} l n c. outF {ListF t} l n c
def recList : {t r : *} -> List t -> r -> ((List t -> r) -> t -> List t -> r) -> r
  = \{t} {r} l n c. fold {ListF t} {r} (\rec case. case {r} n (\hd tl. c rec hd tl)) l

def foldList : {t r : *} -> List t -> r -> (t -> r -> r) -> r
  = \{t} l n c. recList {t} l n (\rec hd tl. c hd (rec tl))

def mapList : {a b : *} -> (a -> b) -> List a -> List b
  = \{a b} f l. foldList {a} {List b} l (Nil {b}) (\hd r. Cons {b} (f hd) r)

-- binary nats
def BNatF = \(r : *). {t : *} -> t -> (r -> t) -> (r -> t) -> t
def BNat = Fix BNatF
def BE : BNat = inF {BNatF} \{t} e z o. e
def B0 : BNat -> BNat = \n. inF {BNatF} \{t} e z o. z n
def B1 : BNat -> BNat = \n. inF {BNatF} \{t} e z o. o n

def caseBNat : {t : *} -> BNat -> t -> (BNat -> t) -> (BNat -> t) -> t
  = \{t} n e z o. outF {BNatF} n {t} e z o
def recBNat : {t : *} -> BNat -> t -> ((BNat -> t) -> BNat -> t) -> ((BNat -> t) -> BNat -> t) -> t
  = \{t} n e z o. fold {BNatF} {t} (\rec m. m {t} e (\k. z rec k) (\k. o rec k)) n

def foldBNat : {t : *} -> BNat -> t -> (t -> t) -> (t -> t) -> t
  = \{t} n e z o. recBNat {t} n e (\rec m. z (rec m)) (\rec m. o (rec m))
