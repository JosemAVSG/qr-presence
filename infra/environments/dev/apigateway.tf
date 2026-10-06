resource "aws_apigatewayv2_api" "http" {
  name          = "qr-presence-api"
  protocol_type = "HTTP"
}

# Integración con la Lambda de check-in (proxy)
resource "aws_apigatewayv2_integration" "check_in" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.check_in.invoke_arn
  payload_format_version = "2.0"
}

# Ruta: POST /check-in -> integración de check-in
resource "aws_apigatewayv2_route" "check_in" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /check-in"
  target    = "integrations/${aws_apigatewayv2_integration.check_in.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

# permiso: API Gateway necesita permiso explícito para invocar la Lambda
resource "aws_lambda_permission" "api_check_in" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.check_in.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
