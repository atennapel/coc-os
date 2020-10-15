import lib/idesc.p
import lib/unit.p

def Desc = IDesc U
def End : Desc = IEnd {U} ()
def Arg : {-A : *} -> (A -> Desc) -> Desc = \{A} f. IArg {U} {A} f
def FArg : (-A : *) -> Desc -> Desc = \A d. IFArg {U} A d
def Rec : Desc -> Desc = \d. IRec {U} () d
def HRec : (-A : *) -> Desc -> Desc = \A d. IHRec {U} {A} (\_. ()) d
def SumD : Desc -> Desc -> Desc = \a b. Arg {Bool} \c. if c a b

def indDesc
  : {-P : Desc -> *}
    -> P End
    -> ((-A : *) -> (f : A -> Desc) -> ((a : A) -> P (f a)) -> P (Arg {A} f))
    -> ((-A : *) -> (d : Desc) -> P d -> P (FArg A d))
    -> ((d : Desc) -> P d -> P (Rec d))
    -> ((-A : *) -> (d : Desc) -> P d -> P (HRec A d))
    -> (d : Desc)
    -> P d
  = \{P} end arg farg rec hrec d. indIDesc {U} {P} (\_. end) arg farg (\_. rec) (\A _. hrec A) d

def interp : Desc -> * -> * = \d x. interpI {U} d (\_. x) ()
def AllDesc : (d : Desc) -> (X : *) -> (X -> *) -> interp d X -> * = \d X P c. AllIDesc U d (\_. X) (\_. P) () c
def allDesc
  : (d : Desc) -> (-X : *) -> (-P : X -> *) -> ((x : X) -> P x) -> (xs : interp d X) -> AllDesc d X P xs
  = \d X P p xs. allIDesc {U} d (\_. X) (\_. P) (\_. p) () xs

def Data : Desc -> * = \d. IData {U} d ()
def Con : {-d : Desc} -> interp d (Data d) -> Data d = \{d} x. ICon {U} {d} {()} x
def ind
  : {d : Desc}
    -> {-P : Data d -> *}
    -> (
      (y : interp d (Data d))
      -> AllDesc d (Data d) P y
      -> P (Con {d} y)
    )
    -> (x : Data d)
    -> P x
  = \{d} {P} h x. indI {U} {d} {\_. P} h {()} x
