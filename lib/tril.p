import lib/unit.p
import lib/bool.p

def Tril : * = (b : Bool) ** if b Bool U
def T0 : Tril = (False, ())
def T1 : Tril = (True, False)
def T2 : Tril = (True, True)

def indTril
  : {-P : Tril -> *}
    -> P T0
    -> P T1
    -> P T2
    -> (t : Tril) -> P t
  = \{P} t0 t1 t2 t. (indBool {\b. (s : if b Bool U) -> P (b, s)} (indBool {\b. P (True, b)} t2 t1) (\_. t0) t.fst) t.snd

def if3
  : {-t : *} -> Tril -> t -> t -> t -> t
  = \{t} c t0 t1 t2. indTril {\_. t} t0 t1 t2 c
