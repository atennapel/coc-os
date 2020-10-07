-- these definitions are from the paper
-- "Generic Constructors and Eliminators from Descriptions"
import lib/idesc.p
import lib/eq.p

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
