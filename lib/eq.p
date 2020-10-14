import lib/void.p

def HEq : {A B : *} -> (a : A) -> (b : B) -> * = \{A B} a b. %HEq A B a b
def HRefl
  : {-A : *} -> {-a : A} -> HEq {A} {A} a a
  = \{A a}. %ReflHEq A a
def elimHEq
  : {-A : *}
    -> {-a : A}
    -> {-P : (b : A) -> HEq {A} {A} a b -> *}
    -> P a (HRefl {A} {a})
    -> {-b : A}
    -> (-p : HEq {A} {A} a b)
    -> P b p
  = \{A a P} h {b} p. %elimHEq A a P h b p

def HNeq = \{A : *} {B : *} (a : A) (b : B). (-p : HEq {A} {B} a b) -> Void

def Eq = \{t : *} (a b : t). HEq {t} {t} a b
def Neq = \{t : *} (a b : t). (-p : Eq {t} a b) -> Void

def Refl
  : {-A : *} -> {-a : A} -> Eq {A} a a
  = HRefl

def elimEq
  : {-A : *}
    -> {-a : A}
    -> {-P : (b : A) -> Eq a b -> *}
    -> P a (Refl {A} {a})
    -> {-b : A}
    -> (-p : Eq {A} a b)
    -> P b p
  = elimHEq

def rewrite
  : {-t : *} -> {-f : t -> *} -> {-a -b : t} -> (-p : Eq {t} a b) -> f a -> f b
  = \{t} {f} {a} {b} p x. elimEq {t} {a} {\b _. f b} x {b} p

def cast
  : {-a -b : *} -> (-p : Eq a b) -> a -> b
  = \{a} {b} p x. rewrite {*} {\x. x} {a} {b} p x

def symm
  : {-t : *} -> {-a -b : t} -> (p : Eq a b) -> Eq b a
  = \{t} {a} {b} p. (elimEq {t} {a} {\c _. Eq c c -> Eq c a} (\x. x) {b} p) (rewrite {_} {\x. Eq x b} p p)

def trans
  : {-t : *} -> {-a -b -c : t} -> (p : Eq a b) -> (-q : Eq b c) -> Eq a c
  = \{t} {a} {b} {c} p q. rewrite {_} {\x. Eq a x} q p

def lift
  : {-t1 : *} -> {-t2 : *} -> {-f : t1 -> t2} -> {-a -b : t1} -> (-p : Eq a b) -> Eq (f a) (f b)
  = \{t1} {t2} {f} {a} {b} p. rewrite {_} {\x. Eq (f a) (f x)} p (Refl {_} {f a})

def eqRefl
  : {-t : *} -> {-x : t} -> (p : Eq x x) -> Eq p (Refl {t} {x})
  = \{t} {x} p. Refl {_} {p}

def eqK
  : {-t : *} -> {-x : t} -> {-P : Eq x x -> *} -> P (Refl {t} {x}) -> (-p : Eq x x) -> P p
  = \{t} {x} {P} q p. q

def eqJ
  : {-t : *} -> {-P : (a b : t) -> Eq a b -> *} -> ({-x : t} -> P x x (Refl {t} {x})) -> {-a -b : t} -> (-p : Eq a b) -> P a b p
  = \{t} {P} q {a} {b} p. elimEq {t} {a} {\c q. P a c q} (q {a}) {b} p

def uip
  : {-t : *} -> {-a -b : t} -> (p1 p2 : Eq a b) -> Eq p1 p2
  = \{t} {a} {b} p1 p2. (elimEq {t} {a} {\c p. (q : Eq a c) -> Eq q p} (eqRefl {t} {a}) {b} p2) p1

def rewriteBoth
  : {-t : *} -> {-f : (x y : t) -> Eq {t} x y -> *} -> {-a -b : t} -> (-p : Eq {t} a b) -> f a b p -> f b a (symm p)
  = \{t} {f} {a} {b} p x. (elimEq {t} {a} {\y e. f a y e -> f y a (symm e)} (\x. x) {b} p) x
