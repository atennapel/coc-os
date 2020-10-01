import lib/type.p

def id : {t : Type} -> t -> t = \x. x
def const : {a b : Type} -> a -> b -> a = \x y. x
def constid : {a b : Type} -> a -> b -> b = \x y. y
def flip : {a b c : Type} -> (a -> b -> c) -> b -> a -> c = \f x y. f y x
def compose : {a b c : Type} -> (b -> c) -> (a -> b) -> a -> c = \f g x. f (g x)
def dup : {a b : Type} -> (a -> a -> b) -> a -> b = \f x. f x x
def apply : {a b : Type} -> (a -> b) -> a -> b = \f x. f x
def trush : {a b : Type} -> a -> (a -> b) -> b = \x f. f x
def sapply : {a b c : Type} -> (a -> b -> c) -> (a -> b) -> a -> c = \f g x. f x (g x)
def fork : {a b c d : Type} -> (a -> b -> c) -> (d -> a) -> (d -> b) -> d -> c = \f g h x. f (g x) (h x)
