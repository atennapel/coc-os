import lib/unit.p
import lib/bool.p

def Desc = %Desc
def End : Desc = %End
def Arg : {A : *} -> (A -> Desc) -> Desc = \{A} f. %Arg A f
def HRec : * -> Desc -> Desc = \A d. %Rec A d
def Rec : Desc -> Desc = HRec U
def SumD : Desc -> Desc -> Desc = \a b. Arg {Bool} \c. if c a b

def indDesc
  : {P : Desc -> *}
    -> P End
    -> ((A : *) -> (f : A -> Desc) -> ((a : A) -> P (f a)) -> P (Arg {A} f))
    -> ((A : *) -> (d : Desc) -> P d -> P (HRec A d))
    -> (d : Desc)
    -> P d
  = \{P} e a r d. %elimDesc P e a r d

def interp : Desc -> * -> * = %interp
def All : (d : Desc) -> (X : *) -> (X -> *) -> interp d X -> * = %All
def all : (d : Desc) -> (X : *) -> (P : X -> *) -> ((x : X) -> P x) -> (xs : interp d X) -> All d X P xs = %all

def mapD : (d : Desc) -> {a b : *} -> (a -> b) -> interp d a -> interp d b
  = \d. indDesc {\d. {a b : *} -> (a -> b) -> interp d a -> interp d b}
      (\_ x. x)
      (\A f rec {a b} g x. (x.fst, rec x.fst {a} {b} g x.snd))
      (\A d rec {a b} g x. ((\y. g (x.fst y)), rec {a} {b} g x.snd))
      d

def Data : Desc -> * = %Data
def Con : {d : Desc} -> interp d (Data d) -> Data d = \{d} x. %Con d x
def ind
  : {d : Desc}
    -> {P : Data d -> *}
    -> (
      (y : interp d (Data d))
      -> All d (Data d) P y
      -> P (Con {d} y)
    )
    -> (x : Data d)
    -> P x
  = \{d} {P} i x. %ind d P i x
