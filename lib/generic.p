-- these definitions are from the paper
-- "Generic Constructors and Eliminators from Descriptions"
import lib/idesc.p
import lib/eq.p

-- generic constructors
def UncurriedEl
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> *
  = \{I} D X. {i : I} -> interpI D X i -> X i

def CurriedEl
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> *
  = \{I} D X. indIDesc {I} {\_. *}
      (\i. X i)
      (\A f rec. (a : A) -> rec a)
      (\A d r. A -> r)
      (\i d r. (x : X i) -> r)
      (\A fi d r. ((a : A) -> X (fi a)) -> r)
      D

def curryEl
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> UncurriedEl D X -> CurriedEl D X
  = \{I} D X. indIDesc {I} {\D. UncurriedEl D X -> CurriedEl D X}
      (\i u. u Refl)
      (\A f r u. \(a : A). r a (\xs. u (a, xs)))
      (\A d r u. \(a : A). r (\xs. u (a, xs)))
      (\i d r u. \(x : X i). r (\xs. u (x, xs)))
      (\A fi d r u. \(g : (a : A) -> X (fi a)). r (\xs. u (g, xs)))
      D

def inj : {I : *} -> (D : IDesc I) -> CurriedEl D (IData D) = \D. curryEl D (IData D) ICon

-- generic eliminators
def UncurriedHyps
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (cn : UncurriedEl D X) -> *
  = \{I} D X P cn. (i : I) -> (xs : interpI D X i) -> (ihs : AllIDesc I D X P i xs) -> P i (cn xs)

def CurriedHyps
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (cn : UncurriedEl D X) -> *
  = \{I} D X P. indIDesc {I} {\D. UncurriedEl D X -> *}
      (\i cn. P i (cn Refl))
      (\A f r cn. (a : A) -> r a (\xs. cn (a, xs)))
      (\A d r cn. (a : A) -> r (\xs. cn (a, xs)))
      (\i d r cn. (x : X i) -> P i x -> r (\xs. cn (x, xs)))
      (\A fi d r cn. (g : (a : A) -> X (fi a)) -> ((a : A) -> P (fi a) (g a)) -> r (\xs. cn (g, xs)))
      D

-- TODO 6.3 and on
--def uncurryHyps
--  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *)
--      -> (cn : UncurriedEl D X) -> CurriedHyps D X P cn -> UncurriedHyps D X P cn
--  = \{I} D X P. indIDesc {I} {\D. (cn : UncurriedEl D X) -> CurriedHyps D X P cn -> UncurriedHyps D X P cn}
--      (\i cn pf j refl tt. _a)
--      (\A f r cn pf i p ihs. let a = p.fst in r a (\ys. cn (a, ys)) (pf a) i p.snd ihs)
--      (\A d r cn pf i p ihs. let a = p.fst in r (\ys. cn (a, ys)) (pf a) i p.snd ihs)
--      (\i d r cn. _b)
--      (\A fi d r cn. _c)
--      D
