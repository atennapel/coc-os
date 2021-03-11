def {Bool} = #2
def False : Bool = @0
def True : Bool = @1

def indBool
  : {P : Bool -> *} ->
    P True ->
    P False ->
    (b : Bool) ->
    P b
  = \{P} t f b. ?2 {P} b f t

def if : {A : *} -> Bool -> A -> A -> A
  = \{A} b t f. indBool {\_. A} t f b
