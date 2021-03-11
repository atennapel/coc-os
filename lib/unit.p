def {Unit} = #1
def UnitValue : Unit = @0

def indUnit
  : {P : Unit -> *} ->
    P UnitValue ->
    (x : Unit) ->
    P x
  = \{P} u x. ?1 {P} x u
