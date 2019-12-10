def opaque List = \(t : *). (r : *) -> r -> (t -> r -> r) -> r

def foldList = \(t : *) (l : List t). open List in l

def Nil
  : (t : *) -> List t
  = \t. open List in \r nil cons. nil
def Cons
  : (t : *) -> t -> List t -> List t
  = \t head tail. open List in \r nil cons. cons head (tail r nil cons)

def map
  : (a b : *) -> (a -> b) -> List a -> List b
  = \a b f l. foldList a l (List b) (Nil b) (\head tail. Cons b (f head) tail)
