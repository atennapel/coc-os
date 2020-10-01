import lib/type.p
import lib/void.p

def HEq : {A B : Type} -> (a : A) -> (b : B) -> Type = \{A B} a b. %HEq A B a b
def HRefl
  : {A : Type} -> {a : A} -> HEq {A} {A} a a
  = \{A a}. %ReflHEq A a
def elimHEq
  : {A : Type}
    -> {a : A}
    -> {P : (b : A) -> HEq {A} {A} a b -> Type}
    -> P a (HRefl {A} {a})
    -> {b : A}
    -> (p : HEq {A} {A} a b)
    -> P b p
  = \{A a P} h {b} p. %elimHEq A a P h b p

def HNeq = \{A : Type} {B : Type} (a : A) (b : B). HEq {A} {B} a b -> Void

def Eq = \{t : Type} (a b : t). HEq {t} {t} a b
def Neq = \{t : Type} (a b : t). Eq {t} a b -> Void

def Refl
  : {A : Type} -> {a : A} -> Eq {A} a a
  = HRefl

def elimEq
  : {A : Type}
    -> {a : A}
    -> {P : (b : A) -> Eq a b -> Type}
    -> P a (Refl {A} {a})
    -> {b : A}
    -> (p : Eq {A} a b)
    -> P b p
  = elimHEq

def rewrite
  : {t : Type} -> {f : t -> Type} -> {a b : t} -> Eq {t} a b -> f a -> f b
  = \{t} {f} {a} {b} p x. elimEq {t} {a} {\_ _. f b} x {b} p

def cast
  : {a b : Type} -> Eq a b -> a -> b
  = \{a} {b} p x. rewrite {Type} {\x. x} {a} {b} p x

def symm
  : {t : Type} -> {a b : t} -> Eq a b -> Eq b a
  = \{t} {a} {b} p. (elimEq {t} {a} {\c _. Eq c c -> Eq c a} (\x. x) {b} p) (rewrite {_} {\x. Eq x b} p p)

def trans
  : {t : Type} -> {a b c : t} -> Eq a b -> Eq b c -> Eq a c
  = \{t} {a} {b} {c} p q. rewrite {_} {\x. Eq a x} q p

def lift
  : {t1 : Type} -> {t2 : Type} -> {f : t1 -> t2} -> {a b : t1} -> Eq a b -> Eq (f a) (f b)
  = \{t1} {t2} {f} {a} {b} p. rewrite {_} {\x. Eq (f a) (f x)} p (Refl {_} {f a})

def eqRefl
  : {t : Type} -> {x : t} -> (p : Eq x x) -> Eq p (Refl {t} {x})
  = \{t} {x} p. Refl {_} {p}

def eqK
  : {t : Type} -> {x : t} -> {P : Eq x x -> Type} -> P (Refl {t} {x}) -> (p : Eq x x) -> P p
  = \{t} {x} {P} q p. q

def eqJ
  : {t : Type} -> {P : (a b : t) -> Eq a b -> Type} -> ({x : t} -> P x x (Refl {t} {x})) -> {a b : t} -> (p : Eq a b) -> P a b p
  = \{t} {P} q {a} {b} p. elimEq {t} {a} {\c q. P a c q} (q {a}) {b} p

def uip
  : {t : Type} -> {a b : t} -> (p1 p2 : Eq a b) -> Eq p1 p2
  = \{t} {a} {b} p1 p2. (elimEq {t} {a} {\c p. (q : Eq a c) -> Eq q p} (eqRefl {t} {a}) {b} p2) p1

def rewriteBoth
  : {t : Type} -> {f : (x y : t) -> Eq {t} x y -> Type} -> {a b : t} -> (p : Eq {t} a b) -> f a b p -> f b a (symm p)
  = \{t} {f} {a} {b} p x. (elimEq {t} {a} {\y e. f a y e -> f y a (symm e)} (\x. x) {b} p) x
