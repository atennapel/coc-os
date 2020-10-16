-- these definitions are from the paper
-- "Generic Constructors and Eliminators from Descriptions"
import lib/idesc.p
import lib/desc.p
import lib/eq.p
import lib/unit.p
import lib/bool.p

-- generic constructors
def UncurriedEl
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> *
  = \{I} D X. {-i : I} -> InterpI D X i -> X i

def -CurriedEl
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> *
  = \{I} D X. indIDesc {I} {\_. *}
      (\i. X i)
      (\A f rec. (a : A) -> rec a)
      (\A f rec. (-a : A) -> rec a)
      (\A d r. A -> r)
      (\i d r. (x : X i) -> r)
      (\A fi d r. ((a : A) -> X (fi a)) -> r)
      D

def curryEl
  : {-I : *} -> (D : IDesc I) -> (-X : I -> *) -> UncurriedEl D X -> CurriedEl D X
  = \{I} D X. indIDesc {I} {\D. UncurriedEl D X -> CurriedEl D X}
      (\i u. u Refl)
      (\A f r u. \(a : A). r a (\xs. u (a, xs)))
      (\A f r u. \(-a : A). r a (\xs. u (a, xs)))
      (\A d r u. \(a : A). r (\xs. u (a, xs)))
      (\i d r u. \(x : X i). r (\xs. u (x, xs)))
      (\A fi d r u. \(g : (a : A) -> X (fi a)). r (\xs. u (g, xs)))
      D

def inj : {-I : *} -> (D : IDesc I) -> CurriedEl D (IData D) = \D. curryEl D (IData D) ICon

-- generic eliminators
def UncurriedHyps
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (cn : UncurriedEl D X) -> *
  = \{I} D X P cn. {-i : I} -> (xs : InterpI D X i) -> (ihs : AllIDesc I D X P i xs) -> P i (cn xs)

def -CurriedHyps
  : {I : *} -> (D : IDesc I) -> (X : I -> *) -> (P : (i : I) -> X i -> *) -> (cn : UncurriedEl D X) -> *
  = \{I} D X P. indIDesc {I} {\D. UncurriedEl D X -> *}
      (\i cn. P i (cn Refl))
      (\A f r cn. (a : A) -> r a (\xs. cn (a, xs)))
      (\A f r cn. (-a : A) -> r a (\xs. cn (a, xs)))
      (\A d r cn. (a : A) -> r (\xs. cn (a, xs)))
      (\i d r cn. (x : X i) -> P i x -> r (\xs. cn (x, xs)))
      (\A fi d r cn. (g : (a : A) -> X (fi a)) -> ((a : A) -> P (fi a) (g a)) -> r (\xs. cn (g, xs)))
      D

def uncurryHyps
  : {-I : *} -> (D : IDesc I) -> (-X : I -> *) -> (-P : (i : I) -> X i -> *)
      -> (cn : UncurriedEl D X) -> CurriedHyps D X P cn -> UncurriedHyps D X P cn
  = \{I} D X P. indIDesc {I} {\D. (cn : UncurriedEl D X) -> CurriedHyps D X P cn -> UncurriedHyps D X P cn}
      (\i cn pf {j} refl tt. elimEq {I} {i} {\k q. P k (cn {k} q)} pf {j} refl)
      (\A f r cn pf {i} p ihs.
        let a = p.fst in
        let xs = p.snd in
        r a (\ys. cn (a, ys)) (pf a) {i} xs ihs)
      (\A f r cn pf {i} p ihs.
        let -a = p.fst in
        let xs = p.snd in
        r a (\ys. cn (a, ys)) (pf a) {i} xs ihs)
      (\A d r cn pf {i} p ihs.
        let a = p.fst in
        let xs = p.snd in
        r (\ys. cn (a, ys)) (pf a) {i} xs ihs)
      (\j d r cn pf {i} p h.
        let x = p.fst in
        let xs = p.snd in
        let ih = h.fst in
        let ihs = h.snd in
        r (\ys. cn (x, ys)) (pf x ih) {i} xs ihs)
      (\A fi d r cn pf {i} p h.
        let xg = p.fst in
        let xs = p.snd in
        let ihg = h.fst in
        let ihs = h.snd in
        r (\ys. cn (xg, ys)) (pf xg ihg) {i} xs ihs)
      D

def indCurried
  : {-I : *}
    -> (D : IDesc I)
    -> (-P : (i : I) -> IData D i -> *)
    -> CurriedHyps D (IData D) P ICon
    -> (-i : I)
    -> (x : IData D i)
    -> P i x
  = \{I} D P f i x. indI {I} {D} {P} (uncurryHyps {I} D (IData D) P ICon f) {i} x

def -SumCurriedHypsBool
  : {I : *}
    -> (C : Bool -> IDesc I)
    -> (P : (i : I) -> IData (IArg {I} {Bool} C) i -> *)
    -> (a : Bool)
    -> *
  = \{I} C P a.
    let D = IArg {I} {Bool} C in
    CurriedHyps (C a) (IData D) P (\xs. ICon {I} {D} (a, xs))

def elimIBool
  : {-I : *}
    -> (C : Bool -> IDesc I)
    -> (
      let D = IArg {I} {Bool} C in
      {-P : (i : I) -> IData D i -> *}
      -> SumCurriedHypsBool C P True
      -> SumCurriedHypsBool C P False
      -> {-i : I}
      -> (x : IData D i)
      -> P i x
    )
  = \{I} C {P} ct cf {i} x.
      let D = IArg {I} {Bool} C in
      indCurried D P (indBool {SumCurriedHypsBool C P} ct cf) i x

def elimBool
  : (C : Bool -> Desc)
    -> (
      let D = Arg {Bool} C in
      {-P : Data D -> *}
      -> SumCurriedHypsBool C (\_. P) True
      -> SumCurriedHypsBool C (\_. P) False
      -> (x : Data D)
      -> P x
    )
  = \C {P} ct cf x. elimIBool C {\_. P} ct cf {()} x
